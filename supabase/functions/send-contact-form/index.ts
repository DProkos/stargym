import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { z } from 'https://esm.sh/zod@3.25.76';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const contactFormSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().max(255),
  phone: z.string().max(20).optional(),
  message: z.string().min(10).max(1000),
  language: z.enum(['el', 'en']).optional().default('el'),
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const requestBody = await req.json();
    const validationResult = contactFormSchema.safeParse(requestBody);
    
    if (!validationResult.success) {
      console.error('Validation failed:', validationResult.error);
      return new Response(
        JSON.stringify({ error: 'Invalid input', details: validationResult.error.format() }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { name, email, phone, message, language } = validationResult.data;
    const lang = language || 'el';

    // Get recipient email
    const { data: emailSettings, error: settingError } = await supabase
      .from('app_settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['contact_form_recipient_email', 'smtp_from_email']);

    if (settingError) {
      console.error('Error fetching email settings:', settingError);
      return new Response(
        JSON.stringify({ error: 'Configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const contactRecipient = emailSettings?.find(s => s.setting_key === 'contact_form_recipient_email')?.setting_value;
    const smtpFromEmail = emailSettings?.find(s => s.setting_key === 'smtp_from_email')?.setting_value;
    const recipientEmail = contactRecipient || smtpFromEmail;
    
    if (!recipientEmail) {
      console.error('No recipient email configured');
      return new Response(
        JSON.stringify({ error: 'Contact form recipient not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Sending contact form from ${name} (${email}) to ${recipientEmail}, lang=${lang}`);

    // Build notification email HTML (always in Greek for admin)
    const htmlContent = buildNotificationEmail(name, email, phone, message);
    const textContent = `Νέο Μήνυμα Επικοινωνίας\n\nΌνομα: ${name}\nEmail: ${email}\n${phone ? `Τηλέφωνο: ${phone}` : ''}\n\nΜήνυμα:\n${message}`;

    // Send notification to admin
    const { error: emailError } = await supabase.functions.invoke('send-email', {
      body: { to: recipientEmail, subject: `Νέο μήνυμα από ${name}`, html: htmlContent, text: textContent },
      headers: { 'X-Internal-Call': 'true' },
    });

    if (emailError) {
      console.error('Error sending email to recipient:', emailError);
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: emailError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Contact form email sent to recipient successfully');

    // Load auto-reply template settings (bilingual)
    const { data: autoReplySettings } = await supabase
      .from('app_settings')
      .select('setting_key, setting_value')
      .in('setting_key', [
        'contact_auto_reply_subject_el',
        'contact_auto_reply_subject_en',
        'contact_auto_reply_heading_el',
        'contact_auto_reply_heading_en',
        'contact_auto_reply_body_el',
        'contact_auto_reply_body_en',
        'contact_auto_reply_signature_el',
        'contact_auto_reply_signature_en',
        'contact_auto_reply_heading_color',
        'contact_auto_reply_heading_text_color',
        'contact_auto_reply_subject',
        'contact_auto_reply_heading',
        'contact_auto_reply_body',
        'contact_auto_reply_signature',
      ]);

    const getVal = (key: string, fallback: string) =>
      autoReplySettings?.find(s => s.setting_key === key)?.setting_value || fallback;

    // Get language-specific values with legacy fallback
    const arSubject = lang === 'en'
      ? getVal('contact_auto_reply_subject_en', 'We received your message!')
      : getVal('contact_auto_reply_subject_el', getVal('contact_auto_reply_subject', 'Λάβαμε το μήνυμά σας!'));

    const arHeading = lang === 'en'
      ? getVal('contact_auto_reply_heading_en', '✉️ Thank you for your message!')
      : getVal('contact_auto_reply_heading_el', getVal('contact_auto_reply_heading', '✉️ Ευχαριστούμε για το μήνυμά σας!'));

    const arBodyRaw = lang === 'en'
      ? getVal('contact_auto_reply_body_en', 'We received your message and will get back to you as soon as possible.\n\nThank you for your interest!')
      : getVal('contact_auto_reply_body_el', getVal('contact_auto_reply_body', 'Λάβαμε το μήνυμά σας και θα επικοινωνήσουμε μαζί σας το συντομότερο δυνατό.\n\nΣας ευχαριστούμε για το ενδιαφέρον σας!'));

    const arSignature = lang === 'en'
      ? getVal('contact_auto_reply_signature_en', 'Our Team')
      : getVal('contact_auto_reply_signature_el', getVal('contact_auto_reply_signature', 'Η Ομάδα μας'));

    const headingColor = getVal('contact_auto_reply_heading_color', '#FFD700');
    const headingTextColor = getVal('contact_auto_reply_heading_text_color', '#0d0d0d');

    const arBody = arBodyRaw.replace(/\{\{name\}\}/g, name);

    const greeting = lang === 'en' ? `Dear ${name},` : `Αγαπητέ/ή ${name},`;
    const regards = lang === 'en' ? 'Best regards,' : 'Με εκτίμηση,';
    const footerText = lang === 'en'
      ? 'This is an automatic confirmation email. Please do not reply to this message.'
      : 'Αυτό είναι ένα αυτόματο email επιβεβαίωσης. Παρακαλούμε μην απαντήσετε σε αυτό το μήνυμα.';

    const autoReplyHtml = buildAutoReplyEmail(arHeading, greeting, arBody, regards, arSignature, footerText, headingColor, headingTextColor);
    const autoReplyText = `${greeting}\n\n${arBody}\n\n${regards}\n${arSignature}`;

    const { error: autoReplyError } = await supabase.functions.invoke('send-email', {
      body: { to: email, subject: arSubject, html: autoReplyHtml, text: autoReplyText },
      headers: { 'X-Internal-Call': 'true' },
    });

    if (autoReplyError) {
      console.error('Error sending auto-reply:', autoReplyError);
    } else {
      console.log('Auto-reply email sent successfully to:', email);
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Message sent successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error processing contact form:', error.message, error.stack);
    return new Response(
      JSON.stringify({ error: 'Failed to process contact form', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function buildNotificationEmail(name: string, email: string, phone: string | undefined, message: string): string {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
    body { font-family: Arial, sans-serif; background-color: #0d0d0d; color: #fff8e1; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background-color: #141414; border-radius: 12px; overflow: hidden; border: 1px solid #4a3d1d; }
    .header { background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%); padding: 30px; text-align: center; }
    .header h1 { color: #0d0d0d; margin: 0; font-size: 24px; }
    .content { padding: 30px; }
    .field { margin-bottom: 20px; }
    .label { color: #FFD700; font-weight: bold; margin-bottom: 5px; display: block; }
    .value { color: #fff8e1; padding: 10px; background-color: #1a1a1a; border-radius: 8px; border-left: 3px solid #FFD700; }
    .footer { padding: 20px; text-align: center; border-top: 1px solid #4a3d1d; color: #a89a6d; font-size: 12px; }
  </style></head><body>
    <div class="container">
      <div class="header"><h1>📩 Νέο Μήνυμα Επικοινωνίας</h1></div>
      <div class="content">
        <div class="field"><span class="label">Όνομα:</span><div class="value">${name}</div></div>
        <div class="field"><span class="label">Email:</span><div class="value"><a href="mailto:${email}" style="color: #FFD700;">${email}</a></div></div>
        ${phone ? `<div class="field"><span class="label">Τηλέφωνο:</span><div class="value"><a href="tel:${phone}" style="color: #FFD700;">${phone}</a></div></div>` : ''}
        <div class="field"><span class="label">Μήνυμα:</span><div class="value" style="white-space:pre-wrap">${message}</div></div>
      </div>
      <div class="footer">Αυτό το email στάλθηκε από τη φόρμα επικοινωνίας του website σας.</div>
    </div>
  </body></html>`;
}

function buildAutoReplyEmail(heading: string, greeting: string, body: string, regards: string, signature: string, footerText: string, headingColor: string, headingTextColor: string): string {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
    body { font-family: Arial, sans-serif; background-color: #0d0d0d; color: #fff8e1; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background-color: #141414; border-radius: 12px; overflow: hidden; border: 1px solid #4a3d1d; }
    .header { background: linear-gradient(135deg, ${headingColor} 0%, ${headingColor}cc 100%); padding: 30px; text-align: center; }
    .header h1 { color: ${headingTextColor}; margin: 0; font-size: 24px; }
    .content { padding: 30px; }
    .greeting { color: ${headingColor}; font-size: 18px; margin-bottom: 20px; }
    .message { color: #fff8e1; line-height: 1.6; }
    .footer { padding: 20px; text-align: center; border-top: 1px solid #4a3d1d; color: #a89a6d; font-size: 12px; }
  </style></head><body>
    <div class="container">
      <div class="header"><h1>${heading}</h1></div>
      <div class="content">
        <p class="greeting">${greeting}</p>
        ${body.split('\n').map((line: string) => `<p class="message">${line}</p>`).join('')}
        <p class="message" style="margin-top: 30px;">
          ${regards}<br><strong style="color: ${headingColor};">${signature}</strong>
        </p>
      </div>
      <div class="footer">${footerText}</div>
    </div>
  </body></html>`;
}
