import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  classIds: string[];
}

const dayNames = ['Κυριακή', 'Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο'];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify admin or trainer role
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has admin or trainer role
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['admin', 'trainer']);

    if (roleError || !roleData || roleData.length === 0) {
      return new Response(
        JSON.stringify({ error: "Admin or trainer access required" }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { classIds }: NotificationRequest = await req.json();

    if (!classIds || classIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No class IDs provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing deletion notifications for ${classIds.length} classes`);

    // Get email template
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('html_template')
      .eq('name', 'class_deletion_notification')
      .single();

    if (templateError) {
      console.error('Error fetching email template:', templateError);
      return new Response(
        JSON.stringify({ error: 'Email template not found' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get class information
    const { data: classes, error: classesError } = await supabase
      .from('classes')
      .select('id, name, time, day_of_week')
      .in('id', classIds);

    if (classesError) {
      console.error('Error fetching classes:', classesError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch class information' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all affected bookings with user profiles
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select(`
        user_id,
        class_id,
        booking_date,
        profiles!inner(email, full_name)
      `)
      .in('class_id', classIds)
      .eq('status', 'confirmed');

    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch bookings' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!bookings || bookings.length === 0) {
      console.log('No confirmed bookings found for these classes');
      return new Response(
        JSON.stringify({ success: true, message: 'No bookings to notify', notified: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Group bookings by user email
    const userBookings = new Map<string, Array<{ className: string; dayName: string; time: string; bookingDate?: string }>>();
    
    bookings.forEach((booking: any) => {
      const classInfo = classes?.find(c => c.id === booking.class_id);
      if (!classInfo) return;

      const email = booking.profiles.email;
      const dayName = dayNames[classInfo.day_of_week];
      
      if (!userBookings.has(email)) {
        userBookings.set(email, []);
      }
      
      userBookings.get(email)!.push({
        className: classInfo.name,
        dayName: dayName,
        time: classInfo.time.substring(0, 5),
        bookingDate: booking.booking_date
      });
    });

    console.log(`Sending notifications to ${userBookings.size} users`);

    // Send emails to each affected user
    let successCount = 0;
    let failCount = 0;

    for (const [email, userClasses] of userBookings) {
      try {
        const classListHtml = userClasses.map(cls => 
          `<li style="color: #333; font-size: 15px; padding: 8px 0; border-bottom: 1px solid #f0f0f0;"><strong>${cls.className}</strong> - ${cls.dayName} στις ${cls.time}${cls.bookingDate ? ` (${new Date(cls.bookingDate).toLocaleDateString('el-GR')})` : ''}</li>`
        ).join('');

        const subject = userClasses.length === 1 
          ? 'Ακύρωση Τάξης - Ειδοποίηση'
          : `Ακύρωση ${userClasses.length} Τάξεων - Ειδοποίηση`;

        const title = userClasses.length === 1 ? 'Ακύρωση Τάξης' : `Ακύρωση ${userClasses.length} Τάξεων`;
        const introText = userClasses.length === 1 
          ? 'Σας ενημερώνουμε ότι η παρακάτω τάξη έχει ακυρωθεί:'
          : 'Σας ενημερώνουμε ότι οι παρακάτω τάξεις έχουν ακυρωθεί:';

        // Replace template variables
        const html = template.html_template
          .replace('{{title}}', title)
          .replace('{{intro_text}}', introText)
          .replace('{{class_list}}', classListHtml);

        const text = `
Ακύρωση ${userClasses.length === 1 ? 'Τάξης' : 'Τάξεων'}

Αγαπητέ μέλος,

Σας ενημερώνουμε ότι ${userClasses.length === 1 ? 'η παρακάτω τάξη έχει ακυρωθεί' : 'οι παρακάτω τάξεις έχουν ακυρωθεί'}:

${userClasses.map(cls => `- ${cls.className} - ${cls.dayName} στις ${cls.time}${cls.bookingDate ? ` (${new Date(cls.bookingDate).toLocaleDateString('el-GR')})` : ''}`).join('\n')}

Λυπούμαστε για την αναστάτωση. Μπορείτε να κάνετε κράτηση σε άλλες διαθέσιμες τάξεις μέσω της πλατφόρμας μας.

Με εκτίμηση,
Η ομάδα του γυμναστηρίου
        `;

        // Call the send-email function
        const { error: emailError } = await supabase.functions.invoke('send-email', {
          body: {
            to: email,
            subject: subject,
            html: html,
            text: text
          }
        });

        if (emailError) {
          console.error(`Failed to send email to ${email}:`, emailError);
          failCount++;
        } else {
          console.log(`Successfully sent notification to ${email}`);
          successCount++;
        }
      } catch (error) {
        console.error(`Error processing email for ${email}:`, error);
        failCount++;
      }
    }

    console.log(`Notification summary: ${successCount} succeeded, ${failCount} failed`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        notified: successCount,
        failed: failCount,
        total: userBookings.size
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in notify-class-deletion:', error);
    return new Response(
      JSON.stringify({ error: 'Notification failed' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
