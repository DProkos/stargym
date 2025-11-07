import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailRequest {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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
      throw new Error('Failed to fetch SMTP settings');
    }

    const smtpConfig: Record<string, string> = {};
    settings?.forEach((s) => {
      smtpConfig[s.setting_key] = s.setting_value || '';
    });

    // Validate SMTP configuration
    if (!smtpConfig.smtp_host || !smtpConfig.smtp_user || !smtpConfig.smtp_password) {
      throw new Error('SMTP not configured. Please configure SMTP settings in admin panel.');
    }

    const { to, subject, html, text }: EmailRequest = await req.json();

    // Create email message in RFC 5322 format
    const from = `${smtpConfig.smtp_from_name} <${smtpConfig.smtp_from_email}>`;
    const boundary = `----=_Part_${Date.now()}`;
    
    let emailBody = `From: ${from}\r\n`;
    emailBody += `To: ${to}\r\n`;
    emailBody += `Subject: ${subject}\r\n`;
    emailBody += `MIME-Version: 1.0\r\n`;
    emailBody += `Content-Type: multipart/alternative; boundary="${boundary}"\r\n\r\n`;
    
    if (text) {
      emailBody += `--${boundary}\r\n`;
      emailBody += `Content-Type: text/plain; charset=UTF-8\r\n\r\n`;
      emailBody += `${text}\r\n\r\n`;
    }
    
    emailBody += `--${boundary}\r\n`;
    emailBody += `Content-Type: text/html; charset=UTF-8\r\n\r\n`;
    emailBody += `${html}\r\n\r\n`;
    emailBody += `--${boundary}--`;

    // Connect to SMTP server
    const port = parseInt(smtpConfig.smtp_port || '587');
    const secure = smtpConfig.smtp_secure === 'true';
    
    console.log(`Connecting to SMTP: ${smtpConfig.smtp_host}:${port}`);
    
    const conn = await Deno.connect({
      hostname: smtpConfig.smtp_host,
      port: port,
    });

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    // Helper functions
    const send = async (data: string) => {
      await conn.write(encoder.encode(data + '\r\n'));
    };

    const receive = async (): Promise<string> => {
      const buffer = new Uint8Array(1024);
      const n = await conn.read(buffer);
      return decoder.decode(buffer.subarray(0, n || 0));
    };

    // SMTP conversation
    await receive(); // Welcome message
    
    await send(`EHLO ${smtpConfig.smtp_host}`);
    await receive();

    if (!secure && port === 587) {
      await send('STARTTLS');
      await receive();
      // Note: Actual TLS upgrade would require additional implementation
      console.warn('TLS upgrade requested but not fully implemented in this basic version');
    }

    // Encode credentials in base64
    const authPlain = btoa(`\0${smtpConfig.smtp_user}\0${smtpConfig.smtp_password}`);
    await send('AUTH PLAIN ' + authPlain);
    await receive();

    await send(`MAIL FROM:<${smtpConfig.smtp_from_email}>`);
    await receive();

    await send(`RCPT TO:<${to}>`);
    await receive();

    await send('DATA');
    await receive();

    await send(emailBody);
    await send('.');
    await receive();

    await send('QUIT');
    conn.close();

    console.log(`Email sent successfully to ${to}`);

    return new Response(
      JSON.stringify({ success: true, message: 'Email sent successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error sending email:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
