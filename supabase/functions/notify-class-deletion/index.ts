import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ClassInfo {
  id: string;
  name: string;
  time: string;
  day_of_week: number;
  booking_date?: string;
}

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

    const { classIds }: NotificationRequest = await req.json();

    if (!classIds || classIds.length === 0) {
      throw new Error('No class IDs provided');
    }

    console.log(`Processing deletion notifications for ${classIds.length} classes`);

    // Get class information
    const { data: classes, error: classesError } = await supabase
      .from('classes')
      .select('id, name, time, day_of_week')
      .in('id', classIds);

    if (classesError) {
      console.error('Error fetching classes:', classesError);
      throw classesError;
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
      throw bookingsError;
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
          `<li><strong>${cls.className}</strong> - ${cls.dayName} στις ${cls.time}${cls.bookingDate ? ` (${new Date(cls.bookingDate).toLocaleDateString('el-GR')})` : ''}</li>`
        ).join('');

        const subject = userClasses.length === 1 
          ? 'Ακύρωση Τάξης - Ειδοποίηση'
          : `Ακύρωση ${userClasses.length} Τάξεων - Ειδοποίηση`;

        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #d32f2f;">Ακύρωση ${userClasses.length === 1 ? 'Τάξης' : 'Τάξεων'}</h2>
            <p>Αγαπητέ μέλος,</p>
            <p>Σας ενημερώνουμε ότι ${userClasses.length === 1 ? 'η παρακάτω τάξη έχει ακυρωθεί' : 'οι παρακάτω τάξεις έχουν ακυρωθεί'}:</p>
            <ul style="list-style-type: none; padding-left: 0;">
              ${classListHtml}
            </ul>
            <p>Λυπούμαστε για την αναστάτωση. Μπορείτε να κάνετε κράτηση σε άλλες διαθέσιμες τάξεις μέσω της πλατφόρμας μας.</p>
            <p style="margin-top: 30px;">Με εκτίμηση,<br>Η ομάδα του γυμναστηρίου</p>
          </div>
        `;

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
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
