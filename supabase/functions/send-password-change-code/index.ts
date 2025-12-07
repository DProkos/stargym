import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    // Generate 6-digit verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Set expiration time (10 minutes from now)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    // Delete any existing unverified codes for this user
    await supabase
      .from('password_change_codes')
      .delete()
      .eq('user_id', user.id)
      .eq('verified', false);

    // Insert new verification code
    const { error: insertError } = await supabase
      .from('password_change_codes')
      .insert({
        user_id: user.id,
        code: code,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      throw insertError;
    }

    // Get user profile for name
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    const userName = profile?.full_name || 'User';

    // Send email with verification code
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .code-box { background: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; border: 2px solid #667eea; }
            .code { font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 5px; }
            .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔒 Verification Code</h1>
            </div>
            <div class="content">
              <p>Γεια σου ${userName},</p>
              
              <p>Λάβαμε αίτημα για αλλαγή του κωδικού πρόσβασής σου. Χρησιμοποίησε τον παρακάτω κωδικό επαλήθευσης:</p>
              
              <div class="code-box">
                <div class="code">${code}</div>
              </div>
              
              <p style="text-align: center; color: #666;">Ο κωδικός λήγει σε <strong>10 λεπτά</strong></p>
              
              <div class="warning">
                <strong>⚠️ Προσοχή:</strong> Αν δεν ζήτησες εσύ την αλλαγή κωδικού, αγνόησε αυτό το email και ο κωδικός σου θα παραμείνει ασφαλής.
              </div>
              
              <p>Για λόγους ασφαλείας:</p>
              <ul>
                <li>Μην μοιράζεσαι αυτόν τον κωδικό με κανέναν</li>
                <li>Το support team μας δεν θα σου ζητήσει ποτέ αυτόν τον κωδικό</li>
                <li>Χρησιμοποίησε τον κωδικό μόνο στην επίσημη σελίδα αλλαγής password</li>
              </ul>
            </div>
            <div class="footer">
              <p>Αυτό το email στάλθηκε αυτόματα. Παρακαλούμε μην απαντήσετε.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send email using send-email function with internal call header
    const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'X-Internal-Call': 'true',
      },
      body: JSON.stringify({
        to: user.email,
        subject: '🔒 Κωδικός Επαλήθευσης για Αλλαγή Password',
        html: emailHtml,
      }),
    });
    
    const emailError = !emailResponse.ok ? await emailResponse.text() : null;

    if (emailError) {
      console.error('Error sending email:', emailError);
      // Don't throw error here - code was saved, email sending can be retried
    }

    return new Response(
      JSON.stringify({ 
        message: "Verification code sent to your email",
        expiresAt: expiresAt.toISOString()
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-password-change-code:", error);
    const status = error.message === "Unauthorized" || error.message === "No authorization header" ? 401 : 500;
    const message = status === 401 ? "Authentication required" : "An error occurred. Please try again.";
    return new Response(
      JSON.stringify({ error: message }),
      {
        status,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);