import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify admin role (for manual triggers) or cron secret (for scheduled triggers)
    const authHeader = req.headers.get('Authorization');
    const cronSecret = req.headers.get('X-Cron-Secret');
    const expectedCronSecret = Deno.env.get('CRON_SECRET');

    // Allow cron jobs with secret
    const isCronJob = cronSecret && expectedCronSecret && cronSecret === expectedCronSecret;
    
    if (!isCronJob) {
      // Must be authenticated admin
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

      // Check if user has admin role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();

      if (roleError || !roleData) {
        return new Response(
          JSON.stringify({ error: "Admin access required" }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log('Starting class reminder job...');

    // Calculate tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDate = tomorrow.toISOString().split('T')[0];

    console.log(`Looking for bookings on: ${tomorrowDate}`);

    // Get all confirmed bookings for tomorrow
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, booking_date, user_id, class_id')
      .eq('booking_date', tomorrowDate)
      .eq('status', 'confirmed');

    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch bookings' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!bookings || bookings.length === 0) {
      console.log('No bookings found for tomorrow');
      return new Response(
        JSON.stringify({ message: 'No bookings to remind', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${bookings.length} bookings for tomorrow`);

    let successCount = 0;
    let failCount = 0;

    // Process each booking
    for (const booking of bookings) {
      try {
        // Get user profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', booking.user_id)
          .single();

        if (!profile || !profile.email) {
          console.error(`No profile found for user ${booking.user_id}`);
          failCount++;
          continue;
        }

        // Get class details
        const { data: classData } = await supabase
          .from('classes')
          .select('name, time, duration_minutes, description')
          .eq('id', booking.class_id)
          .single();

        if (!classData) {
          console.error(`No class found with id ${booking.class_id}`);
          failCount++;
          continue;
        }

        // Format the date nicely
        const bookingDate = new Date(booking.booking_date);
        const formattedDate = bookingDate.toLocaleDateString('el-GR', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });

        // Get day name in Greek
        const dayName = bookingDate.toLocaleDateString('el-GR', { weekday: 'long' });

        // Send reminder email
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Υπενθύμιση Τάξης</h1>
            </div>
            
            <div style="padding: 30px; background-color: #f9f9f9;">
              <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
                Γεια σου ${profile.full_name || 'μέλος'},
              </p>
              
              <p style="font-size: 16px; color: #333;">
                Αυτό είναι μια φιλική υπενθύμιση ότι έχεις μια τάξη προγραμματισμένη για αύριο!
              </p>
              
              <div style="background-color: white; padding: 25px; border-radius: 8px; margin: 25px 0; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <h2 style="color: #667eea; margin-top: 0; margin-bottom: 20px; font-size: 24px;">
                  ${classData.name}
                </h2>
                
                <div style="margin: 15px 0;">
                  <strong style="color: #555; font-size: 14px;">📅 Ημερομηνία:</strong>
                  <p style="margin: 5px 0; font-size: 16px; color: #333;">${formattedDate}</p>
                </div>
                
                <div style="margin: 15px 0;">
                  <strong style="color: #555; font-size: 14px;">🕐 Ώρα:</strong>
                  <p style="margin: 5px 0; font-size: 16px; color: #333;">${classData.time}</p>
                </div>
                
                <div style="margin: 15px 0;">
                  <strong style="color: #555; font-size: 14px;">⏱️ Διάρκεια:</strong>
                  <p style="margin: 5px 0; font-size: 16px; color: #333;">${classData.duration_minutes} λεπτά</p>
                </div>
                
                ${classData.description ? `
                  <div style="margin: 20px 0; padding: 15px; background-color: #f5f5f5; border-radius: 6px;">
                    <p style="margin: 0; color: #666; font-size: 14px;">${classData.description}</p>
                  </div>
                ` : ''}
              </div>
              
              <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; color: #856404; font-size: 14px;">
                  <strong>💡 Συμβουλή:</strong> Φέρτε πετσέτα, νερό και άνετα ρούχα. Παρακαλούμε να φτάσετε 10 λεπτά νωρίτερα!
                </p>
              </div>
              
              <p style="font-size: 14px; color: #666; margin-top: 30px;">
                Αν δεν μπορείς να παρευρεθείς, παρακαλούμε ακύρωσε την κράτησή σου από τον λογαριασμό σου ώστε να μπορέσει κάποιος άλλος να πάρει τη θέση σου.
              </p>
            </div>
            
            <div style="background-color: #333; padding: 20px; text-align: center; border-radius: 0 0 8px 8px;">
              <p style="color: #999; font-size: 12px; margin: 0;">
                Αυτό είναι ένα αυτόματο μήνυμα υπενθύμισης. Παρακαλούμε μην απαντήσετε σε αυτό το email.
              </p>
            </div>
          </div>
        `;

        const textContent = `
Υπενθύμιση Τάξης

Γεια σου ${profile.full_name || 'μέλος'},

Αυτό είναι μια φιλική υπενθύμιση ότι έχεις μια τάξη προγραμματισμένη για αύριο!

Τάξη: ${classData.name}
Ημερομηνία: ${formattedDate}
Ώρα: ${classData.time}
Διάρκεια: ${classData.duration_minutes} λεπτά

${classData.description ? `\n${classData.description}\n` : ''}
Φέρτε πετσέτα, νερό και άνετα ρούχα. Παρακαλούμε να φτάσετε 10 λεπτά νωρίτερα!

Αν δεν μπορείς να παρευρεθείς, παρακαλούμε ακύρωσε την κράτησή σου από τον λογαριασμό σου.
        `.trim();

        // Call send-email function
        const { error: emailError } = await supabase.functions.invoke('send-email', {
          body: {
            to: profile.email,
            subject: `Υπενθύμιση: ${classData.name} - ${dayName}`,
            html: emailHtml,
            text: textContent
          }
        });

        if (emailError) {
          console.error(`Failed to send email to ${profile.email}:`, emailError);
          failCount++;
        } else {
          console.log(`Reminder sent successfully to ${profile.email}`);
          successCount++;
        }
      } catch (error) {
        console.error(`Error processing booking ${booking.id}:`, error);
        failCount++;
      }
    }

    const summary = {
      message: 'Class reminders processed',
      date: tomorrowDate,
      totalBookings: bookings.length,
      successCount,
      failCount
    };

    console.log('Job completed:', summary);

    return new Response(
      JSON.stringify(summary),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in send-class-reminders:', error);
    return new Response(
      JSON.stringify({ error: 'Reminder processing failed' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
