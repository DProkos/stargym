import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { z } from 'https://esm.sh/zod@3.25.76';


const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const emailSchema = z.object({
  to: z.string().email({ message: "Invalid email address" }).max(255),
  subject: z.string().min(1).max(200),
  html: z.string().max(100000),
  text: z.string().max(50000).optional(),
  attachments: z.array(z.object({
    filename: z.string(),
    content: z.string(), // base64 encoded
    contentType: z.string(),
  })).optional(),
});

// Simple SMTP over TLS using Web Streams
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
  
  // For Gmail with port 587, we need STARTTLS which is complex in Deno edge functions
  // For port 465, we need direct TLS connection
  // Let's use the MailChannels API approach which works in edge functions
  
  // Since direct SMTP is problematic in edge functions, let's try a fetch-based approach
  // Using SMTP2GO or similar service that has an HTTP API
  
  // Build the MIME message
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

  // Connect to SMTP server with TLS
  let conn: Deno.TlsConn | Deno.TcpConn;
  
  if (port === 465) {
    // Direct TLS connection
    conn = await Deno.connectTls({
      hostname: host,
      port: port,
    });
  } else {
    // For port 587, we need to upgrade to TLS after STARTTLS
    // This is the problematic part in edge functions
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
    
    // Initial greeting
    const greeting = await read(tcpConn);
    console.log("SMTP Greeting:", greeting.trim());
    
    // EHLO
    await write(tcpConn, `EHLO ${host}`);
    const ehloResp = await read(tcpConn);
    console.log("EHLO Response:", ehloResp.trim());
    
    // STARTTLS
    await write(tcpConn, "STARTTLS");
    const starttlsResp = await read(tcpConn);
    console.log("STARTTLS Response:", starttlsResp.trim());
    
    if (!starttlsResp.startsWith("220")) {
      tcpConn.close();
      throw new Error("STARTTLS failed: " + starttlsResp);
    }
    
    // Upgrade to TLS - this is where edge functions often have issues
    try {
      conn = await Deno.startTls(tcpConn, {
        hostname: host,
      });
    } catch (tlsError) {
      console.error("TLS upgrade failed:", tlsError);
      throw new Error("TLS upgrade failed. Gmail SMTP requires TLS which may not be fully supported in this environment.");
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
    // For port 465, read initial greeting
    if (port === 465) {
      const greeting = await read();
      console.log("SMTP Greeting:", greeting.trim());
    }
    
    // EHLO again after TLS
    await write(`EHLO ${host}`);
    const ehlo2 = await read();
    console.log("EHLO (TLS):", ehlo2.substring(0, 100));
    
    // AUTH LOGIN
    const authString = `\0${user}\0${pass}`;
    const authBase64 = btoa(authString);
    await write(`AUTH PLAIN ${authBase64}`);
    const authResp = await read();
    console.log("AUTH Response:", authResp.trim());
    
    if (!authResp.startsWith("235")) {
      throw new Error("Authentication failed: " + authResp);
    }
    
    // MAIL FROM
    await write(`MAIL FROM:<${from}>`);
    const mailFromResp = await read();
    console.log("MAIL FROM:", mailFromResp.trim());
    
    // RCPT TO
    await write(`RCPT TO:<${to}>`);
    const rcptResp = await read();
    console.log("RCPT TO:", rcptResp.trim());
    
    // DATA
    await write("DATA");
    const dataResp = await read();
    console.log("DATA:", dataResp.trim());
    
    // Send message
    await conn.write(encoder.encode(mimeMessage + "\r\n.\r\n"));
    const sendResp = await read();
    console.log("Message sent:", sendResp.trim());
    
    if (!sendResp.startsWith("250")) {
      throw new Error("Failed to send message: " + sendResp);
    }
    
    // QUIT
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

    // Check for internal service call (from other edge functions using service role key)
    const authHeader = req.headers.get('Authorization');
    const internalCall = req.headers.get('X-Internal-Call') === 'true';
    console.log('Auth header present:', !!authHeader, 'Internal call:', internalCall);
    
    // If internal call, skip user authentication (called from other edge functions)
    if (!internalCall) {
      if (!authHeader) {
        console.error('No authorization header provided');
        return new Response(
          JSON.stringify({ error: 'Authentication required' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const token = authHeader.replace('Bearer ', '');
      
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      console.log('User fetched:', user?.id, 'Error:', userError?.message);
      
      if (userError || !user) {
        console.error('User verification failed:', userError?.message);
        return new Response(
          JSON.stringify({ error: 'Authentication required' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if user has admin role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (roleError || !roleData) {
        console.error('Unauthorized email send attempt by user:', user.id);
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      console.log('Internal call from edge function - skipping user auth');
    }

    // Validate input
    const requestBody = await req.json();
    const validationResult = emailSchema.safeParse(requestBody);
    
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid input', details: validationResult.error.format() }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { to, subject, html, text } = validationResult.data;

    // Get SMTP settings from database
    const { data: settings, error: settingsError } = await supabase
      .from('app_settings')
      .select('setting_key, setting_value')
      .in('setting_key', [
        'smtp_host',
        'smtp_port',
        'smtp_secure',
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
      console.error('SMTP not configured properly');
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const port = parseInt(smtpConfig.smtp_port || '587');
    const fromEmail = smtpConfig.smtp_from_email || smtpConfig.smtp_user;
    const fromName = smtpConfig.smtp_from_name || 'System';
    
    console.log(`Sending email to ${to} via ${smtpConfig.smtp_host}:${port}`);

    await sendEmailViaSMTP({
      host: smtpConfig.smtp_host,
      port: port,
      user: smtpConfig.smtp_user,
      pass: smtpConfig.smtp_password,
      from: fromEmail,
      fromName: fromName,
      to: to,
      subject: subject,
      html: html,
      text: text,
    });
    
    console.log(`Email sent successfully to ${to}`);

    return new Response(
      JSON.stringify({ success: true, message: 'Email sent successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error sending email:', error.message, error.stack);
    return new Response(
      JSON.stringify({ error: 'Failed to send email', details: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
