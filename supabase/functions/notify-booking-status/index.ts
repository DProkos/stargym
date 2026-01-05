import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotifyRequest {
  bookingId: string;
  status: 'confirmed' | 'rejected';
  trainerNotes?: string;
}

// Simple SMTP over TLS
async function sendEmailViaSMTP(config: {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
  fromName: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<void> {
  const { host, port, user, pass, from, fromName, to, subject, html, text } = config;
  
  const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  
  let mimeMessage = `From: "${fromName}" <${from}>\r\n`;
  mimeMessage += `To: ${to}\r\n`;
  mimeMessage += `Subject: ${subject}\r\n`;
  mimeMessage += `MIME-Version: 1.0\r\n`;
  mimeMessage += `Content-Type: multipart/alternative; boundary="${boundary}"\r\n\r\n`;
  
  if (text) {
    mimeMessage += `--${boundary}\r\n`;
    mimeMessage += `Content-Type: text/plain; charset=UTF-8\r\n\r\n`;
    mimeMessage += `${text}\r\n\r\n`;
  }
  
  mimeMessage += `--${boundary}\r\n`;
  mimeMessage += `Content-Type: text/html; charset=UTF-8\r\n\r\n`;
  mimeMessage += `${html}\r\n\r\n`;
  mimeMessage += `--${boundary}--`;

  let conn: Deno.TlsConn | Deno.TcpConn;
  
  if (port === 465) {
    conn = await Deno.connectTls({
      hostname: host,
      port: port,
    });
  } else {
    const tcpConn = await Deno.connect({
      hostname: host,
      port: port,
    });
    
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    
    const read = async (c: Deno.TcpConn): Promise<string> => {
      const buf = new Uint8Array(1024);
      const n = await c.read(buf);
      return decoder.decode(buf.subarray(0, n || 0));
    };
    
    const write = async (c: Deno.TcpConn, data: string): Promise<void> => {
      await c.write(encoder.encode(data + "\r\n"));
    };
    
    const greeting = await read(tcpConn);
    console.log("SMTP Greeting:", greeting.trim());
    
    await write(tcpConn, `EHLO ${host}`);
    const ehloResp = await read(tcpConn);
    console.log("EHLO Response:", ehloResp.trim());
    
    await write(tcpConn, "STARTTLS");
    const starttlsResp = await read(tcpConn);
    console.log("STARTTLS Response:", starttlsResp.trim());
    
    if (!starttlsResp.startsWith("220")) {
      tcpConn.close();
      throw new Error("STARTTLS failed: " + starttlsResp);
    }
    
    try {
      conn = await Deno.startTls(tcpConn, {
        hostname: host,
      });
    } catch (tlsError) {
      console.error("TLS upgrade failed:", tlsError);
      throw new Error("TLS upgrade failed.");
    }
  }
  
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  
  const read = async (): Promise<string> => {
    const buf = new Uint8Array(2048);
    const n = await conn.read(buf);
    return decoder.decode(buf.subarray(0, n || 0));
  };
  
  const write = async (data: string): Promise<void> => {
    await conn.write(encoder.encode(data + "\r\n"));
  };
  
  try {
    if (port === 465) {
      const greeting = await read();
      console.log("SMTP Greeting:", greeting.trim());
    }
    
    await write(`EHLO ${host}`);
    const ehlo2 = await read();
    console.log("EHLO (TLS):", ehlo2.substring(0, 100));
    
    const authString = `\0${user}\0${pass}`;
    const authBase64 = btoa(authString);
    await write(`AUTH PLAIN ${authBase64}`);
    const authResp = await read();
    console.log("AUTH Response:", authResp.trim());
    
    if (!authResp.startsWith("235")) {
      throw new Error("Authentication failed: " + authResp);
    }
    
    await write(`MAIL FROM:<${from}>`);
    const mailFromResp = await read();
    console.log("MAIL FROM:", mailFromResp.trim());
    
    await write(`RCPT TO:<${to}>`);
    const rcptResp = await read();
    console.log("RCPT TO:", rcptResp.trim());
    
    await write("DATA");
    const dataResp = await read();
    console.log("DATA:", dataResp.trim());
    
    await conn.write(encoder.encode(mimeMessage + "\r\n.\r\n"));
    const sendResp = await read();
    console.log("Message sent:", sendResp.trim());
    
    if (!sendResp.startsWith("250")) {
      throw new Error("Failed to send message: " + sendResp);
    }
    
    await write("QUIT");
    
  } finally {
    conn.close();
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user is trainer or admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has trainer or admin role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['trainer', 'admin']);

    if (!roleData || roleData.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { bookingId, status, trainerNotes }: NotifyRequest = await req.json();

    if (!bookingId || !status) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get booking details with class and user info
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        class:classes(name, time)
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      console.error('Booking not found:', bookingError);
      return new Response(
        JSON.stringify({ error: 'Booking not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', booking.user_id)
      .single();

    if (!profile?.email) {
      return new Response(
        JSON.stringify({ error: 'User email not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get SMTP settings
    const { data: settings, error: settingsError } = await supabase
      .from('app_settings')
      .select('setting_key, setting_value')
      .in('setting_key', [
        'smtp_host',
        'smtp_port',
        'smtp_user',
        'smtp_password',
        'smtp_from_email',
        'smtp_from_name'
      ]);

    if (settingsError) {
      console.error('Error fetching SMTP settings:', settingsError);
      return new Response(
        JSON.stringify({ error: 'Configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const smtpConfig: Record<string, string> = {};
    settings?.forEach((s) => {
      smtpConfig[s.setting_key] = s.setting_value || '';
    });

    if (!smtpConfig.smtp_host || !smtpConfig.smtp_user || !smtpConfig.smtp_password) {
      console.error('SMTP not configured');
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format date
    const bookingDate = new Date(booking.booking_date);
    const formattedDate = bookingDate.toLocaleDateString('el-GR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const isConfirmed = status === 'confirmed';
    const statusText = isConfirmed ? 'Επιβεβαιώθηκε' : 'Απορρίφθηκε';
    const statusColor = isConfirmed ? '#22c55e' : '#ef4444';
    const statusIcon = isConfirmed ? '✓' : '✗';

    const subject = isConfirmed 
      ? `Η κράτησή σας για ${booking.class.name} επιβεβαιώθηκε!`
      : `Η κράτησή σας για ${booking.class.name} απορρίφθηκε`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f4f5;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #18181b 0%, #27272a 100%); padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">Ενημέρωση Κράτησης</h1>
            </td>
          </tr>
          
          <!-- Status Badge -->
          <tr>
            <td style="padding: 30px 30px 20px; text-align: center;">
              <div style="display: inline-block; background-color: ${statusColor}; color: white; padding: 12px 24px; border-radius: 50px; font-size: 18px; font-weight: 600;">
                ${statusIcon} ${statusText}
              </div>
            </td>
          </tr>
          
          <!-- Greeting -->
          <tr>
            <td style="padding: 0 30px 20px;">
              <p style="margin: 0; font-size: 16px; color: #3f3f46;">
                Γεια σου ${profile.full_name || 'φίλε/η'},
              </p>
            </td>
          </tr>
          
          <!-- Message -->
          <tr>
            <td style="padding: 0 30px 20px;">
              <p style="margin: 0; font-size: 16px; color: #3f3f46; line-height: 1.6;">
                ${isConfirmed 
                  ? 'Με χαρά σας ενημερώνουμε ότι η κράτησή σας έχει επιβεβαιωθεί! Σας περιμένουμε.'
                  : 'Λυπούμαστε, αλλά η κράτησή σας δεν μπόρεσε να επιβεβαιωθεί αυτή τη φορά.'
                }
              </p>
            </td>
          </tr>
          
          <!-- Booking Details -->
          <tr>
            <td style="padding: 0 30px 20px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f4f5; border-radius: 8px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 10px; font-size: 14px; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px;">Λεπτομέρειες Κράτησης</p>
                    <p style="margin: 0 0 8px; font-size: 16px; color: #18181b;"><strong>Μάθημα:</strong> ${booking.class.name}</p>
                    <p style="margin: 0 0 8px; font-size: 16px; color: #18181b;"><strong>Ημερομηνία:</strong> ${formattedDate}</p>
                    <p style="margin: 0; font-size: 16px; color: #18181b;"><strong>Ώρα:</strong> ${booking.class.time}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          ${trainerNotes ? `
          <!-- Trainer Notes -->
          <tr>
            <td style="padding: 0 30px 20px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
                <tr>
                  <td style="padding: 15px 20px;">
                    <p style="margin: 0 0 5px; font-size: 14px; color: #92400e; font-weight: 600;">Σημείωση από τον προπονητή:</p>
                    <p style="margin: 0; font-size: 14px; color: #78350f;">${trainerNotes}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ` : ''}
          
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 30px; background-color: #f4f4f5; text-align: center;">
              <p style="margin: 0; font-size: 14px; color: #71717a;">
                Για οποιαδήποτε απορία, επικοινωνήστε μαζί μας.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const text = `
${statusText}: ${booking.class.name}

Γεια σου ${profile.full_name || 'φίλε/η'},

${isConfirmed 
  ? 'Με χαρά σας ενημερώνουμε ότι η κράτησή σας έχει επιβεβαιωθεί!'
  : 'Λυπούμαστε, αλλά η κράτησή σας δεν μπόρεσε να επιβεβαιωθεί.'
}

Λεπτομέρειες:
- Μάθημα: ${booking.class.name}
- Ημερομηνία: ${formattedDate}
- Ώρα: ${booking.class.time}

${trainerNotes ? `Σημείωση από τον προπονητή: ${trainerNotes}` : ''}
    `;

    const port = parseInt(smtpConfig.smtp_port || '587');
    const fromEmail = smtpConfig.smtp_from_email || smtpConfig.smtp_user;
    const fromName = smtpConfig.smtp_from_name || 'Gym';

    console.log(`Sending booking notification to ${profile.email}`);

    await sendEmailViaSMTP({
      host: smtpConfig.smtp_host,
      port: port,
      user: smtpConfig.smtp_user,
      pass: smtpConfig.smtp_password,
      from: fromEmail,
      fromName: fromName,
      to: profile.email,
      subject: subject,
      html: html,
      text: text,
    });

    console.log(`Booking notification sent successfully to ${profile.email}`);

    return new Response(
      JSON.stringify({ success: true, message: 'Notification sent' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error sending notification:', error.message, error.stack);
    return new Response(
      JSON.stringify({ error: 'Failed to send notification', details: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
