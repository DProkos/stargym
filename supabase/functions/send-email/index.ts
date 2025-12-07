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

    const { to, subject, html, text, attachments } = validationResult.data;

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
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
    
    // Add attachments if present
    if (attachments && attachments.length > 0) {
      for (const attachment of attachments) {
        emailBody += `--${boundary}\r\n`;
        emailBody += `Content-Type: ${attachment.contentType}\r\n`;
        emailBody += `Content-Transfer-Encoding: base64\r\n`;
        emailBody += `Content-Disposition: attachment; filename="${attachment.filename}"\r\n\r\n`;
        emailBody += `${attachment.content}\r\n\r\n`;
      }
    }
    
    emailBody += `--${boundary}--`;

    // Connect to SMTP server
    const port = parseInt(smtpConfig.smtp_port || '587');
    const secure = smtpConfig.smtp_secure === 'true';
    
    console.log(`Sending email to ${to}`);
    
    const conn = await Deno.connect({
      hostname: smtpConfig.smtp_host,
      port: port,
    });

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const send = async (data: string) => {
      await conn.write(encoder.encode(data + '\r\n'));
    };

    const receive = async (): Promise<string> => {
      const buffer = new Uint8Array(1024);
      const n = await conn.read(buffer);
      return decoder.decode(buffer.subarray(0, n || 0));
    };

    // SMTP conversation
    await receive();
    await send(`EHLO ${smtpConfig.smtp_host}`);
    await receive();

    if (!secure && port === 587) {
      await send('STARTTLS');
      await receive();
    }

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
      JSON.stringify({ error: 'Failed to send email' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
