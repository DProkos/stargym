import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotifyRequest {
  classId: string;
  className: string;
  status: 'cancelled' | 'postponed';
  reason?: string;
  affectedDate?: string;
  trainerName: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin or trainer role
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
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
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { classId, className, status, reason, affectedDate, trainerName }: NotifyRequest = await req.json();

    if (!classId || !className || !status || !trainerName) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get all users with bookings for this class
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select(`
        user_id,
        booking_date,
        profiles!inner(email, full_name)
      `)
      .eq('class_id', classId)
      .eq('status', 'confirmed');

    if (bookingsError) {
      console.error('Failed to fetch bookings:', bookingsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch bookings" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!bookings || bookings.length === 0) {
      console.log("No bookings found for this class");
      return new Response(
        JSON.stringify({ message: "No bookings to notify" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Filter bookings if affectedDate is specified
    const affectedBookings = affectedDate 
      ? bookings.filter(b => b.booking_date === affectedDate)
      : bookings;

    if (affectedBookings.length === 0) {
      console.log("No bookings found for the specified date");
      return new Response(
        JSON.stringify({ message: "No bookings to notify for this date" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Prepare email content
    const statusText = status === 'cancelled' ? 'Ακυρώθηκε' : 'Αναβλήθηκε';
    const subject = `${statusText} το μάθημα: ${className}`;
    
    // Send emails to all affected users using the send-email function
    const emailPromises = affectedBookings.map(async (booking: any) => {
      const userEmail = booking.profiles.email;
      const userName = booking.profiles.full_name || 'Μέλος';
      const bookingDate = new Date(booking.booking_date).toLocaleDateString('el-GR');

      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
              .status-badge { display: inline-block; padding: 8px 16px; border-radius: 20px; font-weight: bold; margin: 20px 0; }
              .cancelled { background: #fee; color: #c00; }
              .postponed { background: #ffc; color: #960; }
              .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Ενημέρωση Μαθήματος</h1>
              </div>
              <div class="content">
                <p>Γεια σου ${userName},</p>
                
                <div class="status-badge ${status}">
                  ${statusText.toUpperCase()}
                </div>
                
                <div class="info-box">
                  <h2 style="margin-top: 0;">Στοιχεία Μαθήματος</h2>
                  <p><strong>Μάθημα:</strong> ${className}</p>
                  <p><strong>Ημερομηνία:</strong> ${bookingDate}</p>
                  <p><strong>Γυμναστής:</strong> ${trainerName}</p>
                  ${reason ? `<p><strong>Λόγος:</strong> ${reason}</p>` : ''}
                </div>
                
                ${status === 'cancelled' ? `
                  <p>Λυπούμαστε που πρέπει να σας ενημερώσουμε ότι το μάθημα ακυρώθηκε. 
                  Η κράτησή σας έχει ακυρωθεί αυτόματα.</p>
                ` : `
                  <p>Το μάθημα έχει αναβληθεί. Θα ενημερωθείτε σύντομα για τη νέα ημερομηνία.</p>
                `}
                
                <p>Για περισσότερες πληροφορίες, παρακαλούμε επικοινωνήστε μαζί μας.</p>
                
                <p>Ευχαριστούμε για την κατανόησή σας!</p>
              </div>
              <div class="footer">
                <p>Αυτό το email στάλθηκε αυτόματα. Παρακαλούμε μην απαντήσετε.</p>
              </div>
            </div>
          </body>
        </html>
      `;

      try {
        // Call the send-email function
        const { error: emailError } = await supabase.functions.invoke('send-email', {
          body: {
            to: userEmail,
            subject: subject,
            html: htmlContent,
          },
        });
        
        if (emailError) throw emailError;
        
        console.log(`Email sent to ${userEmail}`);
        return { success: true, email: userEmail };
      } catch (error: any) {
        console.error(`Failed to send email to ${userEmail}:`, error);
        return { success: false, email: userEmail, error: error.message };
      }
    });

    const results = await Promise.all(emailPromises);
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log(`Emails sent: ${successCount} successful, ${failCount} failed`);

    // If status is cancelled, update booking status
    if (status === 'cancelled') {
      const bookingIds = affectedBookings.map((b: any) => b.user_id);
      
      await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('class_id', classId)
        .eq('status', 'confirmed')
        .in('user_id', bookingIds);
        
      if (affectedDate) {
        await supabase
          .from('bookings')
          .update({ status: 'cancelled' })
          .eq('class_id', classId)
          .eq('booking_date', affectedDate);
      }
    }

    return new Response(
      JSON.stringify({
        message: "Notifications sent",
        successful: successCount,
        failed: failCount,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in notify-class-status-change:", error);
    return new Response(
      JSON.stringify({ error: "Notification failed" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
