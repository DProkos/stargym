import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { z } from 'https://esm.sh/zod@3.25.76';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const notifySchema = z.object({
  class_id: z.string().uuid({ message: "Invalid class ID format" }),
  booking_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Invalid date format, use YYYY-MM-DD" }),
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseClient = createClient(supabaseUrl, token);
    
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has admin or trainer role
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['admin', 'trainer'])
      .maybeSingle();

    if (roleError || !roleData) {
      console.error('Unauthorized waitlist notification attempt by user:', user.id);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate input
    const requestBody = await req.json();
    const validationResult = notifySchema.safeParse(requestBody);
    
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid input', details: validationResult.error.format() }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { class_id, booking_date } = validationResult.data;

    console.log(`Checking waitlist for class ${class_id} on ${booking_date} by user ${user.id}`);

    // Get the first person in waitlist who hasn't been notified
    const { data: waitlistEntry, error: waitlistError } = await supabase
      .from('waitlist')
      .select('id, user_id, position, profiles(email, full_name)')
      .eq('class_id', class_id)
      .eq('booking_date', booking_date)
      .eq('notified', false)
      .order('position', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (waitlistError || !waitlistEntry) {
      console.log('No one in waitlist or already notified');
      return new Response(
        JSON.stringify({ message: 'No waitlist entries to notify' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get class details
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('name, description')
      .eq('id', class_id)
      .single();

    if (classError || !classData) {
      return new Response(
        JSON.stringify({ error: 'Class not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userProfile = waitlistEntry.profiles as any;
    const userEmail = userProfile?.email;
    const userName = userProfile?.full_name || 'Member';

    if (!userEmail) {
      console.error('User email not found for waitlist entry');
      return new Response(
        JSON.stringify({ error: 'User email not found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const formattedDate = new Date(booking_date).toLocaleDateString('el-GR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Διαθέσιμη Θέση στην Τάξη!</h2>
        <p>Γεια σου ${userName},</p>
        <p>Χαρούμενα νέα! Μια θέση άδειασε στην τάξη που περιμένατε:</p>
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #2563eb;">${classData.name}</h3>
          <p style="margin: 10px 0;"><strong>Ημερομηνία:</strong> ${formattedDate}</p>
          <p style="margin: 10px 0;">${classData.description || ''}</p>
        </div>
        <p>Συνδεθείτε τώρα για να κλείσετε τη θέση σας πριν γεμίσει ξανά!</p>
        <p style="margin-top: 30px;">
          <a href="${supabaseUrl.replace('supabase.co', 'lovable.app')}/classes" 
             style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Κλείσε Θέση Τώρα
          </a>
        </p>
        <p style="margin-top: 30px; color: #666; font-size: 12px;">
          Αυτό το email στάλθηκε επειδή είστε στη λίστα αναμονής για αυτή την τάξη.
        </p>
      </div>
    `;

    const { error: emailError } = await supabase.functions.invoke('send-email', {
      body: {
        to: userEmail,
        subject: `Διαθέσιμη Θέση: ${classData.name} - ${formattedDate}`,
        html: emailHtml,
        text: `Γεια σου ${userName}, Μια θέση άδειασε στην τάξη ${classData.name} στις ${formattedDate}. Συνδεθείτε τώρα για να κλείσετε τη θέση σας!`
      }
    });

    if (emailError) {
      console.error('Error sending email:', emailError);
      return new Response(
        JSON.stringify({ error: 'Failed to send notification' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { error: updateError } = await supabase
      .from('waitlist')
      .update({ notified: true })
      .eq('id', waitlistEntry.id);

    if (updateError) {
      console.error('Error updating waitlist:', updateError);
    }

    console.log(`Successfully notified ${userEmail} about available spot by ${user.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Waitlist notification sent',
        notified_user: userEmail
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in notify-waitlist:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to send notification' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
