import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotifyRequest {
  class_id: string;
  booking_date: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { class_id, booking_date }: NotifyRequest = await req.json();

    console.log(`Checking waitlist for class ${class_id} on ${booking_date}`);

    // Get the first person in waitlist (lowest position) who hasn't been notified
    const { data: waitlistEntry, error: waitlistError } = await supabase
      .from('waitlist')
      .select('id, user_id, position, profiles(email, full_name)')
      .eq('class_id', class_id)
      .eq('booking_date', booking_date)
      .eq('notified', false)
      .order('position', { ascending: true })
      .limit(1)
      .single();

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
      throw new Error('Failed to fetch class details');
    }

    const userProfile = waitlistEntry.profiles as any;
    const userEmail = userProfile?.email;
    const userName = userProfile?.full_name || 'Member';

    if (!userEmail) {
      console.error('User email not found');
      throw new Error('User email not found');
    }

    // Format the date nicely
    const formattedDate = new Date(booking_date).toLocaleDateString('el-GR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Send email notification
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

    // Call send-email function
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
      throw emailError;
    }

    // Mark as notified
    const { error: updateError } = await supabase
      .from('waitlist')
      .update({ notified: true })
      .eq('id', waitlistEntry.id);

    if (updateError) {
      console.error('Error updating waitlist:', updateError);
      throw updateError;
    }

    console.log(`Successfully notified ${userEmail} about available spot`);

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
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});