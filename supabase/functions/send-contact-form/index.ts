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
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Validate input
    const requestBody = await req.json();
    const validationResult = contactFormSchema.safeParse(requestBody);
    
    if (!validationResult.success) {
      console.error('Validation failed:', validationResult.error);
      return new Response(
        JSON.stringify({ error: 'Invalid input', details: validationResult.error.format() }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { name, email, phone, message } = validationResult.data;

    // Get recipient email - use contact_form_recipient_email if set, otherwise fall back to smtp_from_email
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

    console.log(`Sending contact form from ${name} (${email}) to ${recipientEmail}`);

    // Build email HTML
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; background-color: #0d0d0d; color: #fff8e1; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background-color: #141414; border-radius: 12px; overflow: hidden; border: 1px solid #4a3d1d; }
          .header { background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%); padding: 30px; text-align: center; }
          .header h1 { color: #0d0d0d; margin: 0; font-size: 24px; }
          .content { padding: 30px; }
          .field { margin-bottom: 20px; }
          .label { color: #FFD700; font-weight: bold; margin-bottom: 5px; display: block; }
          .value { color: #fff8e1; padding: 10px; background-color: #1a1a1a; border-radius: 8px; border-left: 3px solid #FFD700; }
          .message-value { white-space: pre-wrap; }
          .footer { padding: 20px; text-align: center; border-top: 1px solid #4a3d1d; color: #a89a6d; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📩 Νέο Μήνυμα Επικοινωνίας</h1>
          </div>
          <div class="content">
            <div class="field">
              <span class="label">Όνομα:</span>
              <div class="value">${name}</div>
            </div>
            <div class="field">
              <span class="label">Email:</span>
              <div class="value"><a href="mailto:${email}" style="color: #FFD700;">${email}</a></div>
            </div>
            ${phone ? `
            <div class="field">
              <span class="label">Τηλέφωνο:</span>
              <div class="value"><a href="tel:${phone}" style="color: #FFD700;">${phone}</a></div>
            </div>
            ` : ''}
            <div class="field">
              <span class="label">Μήνυμα:</span>
              <div class="value message-value">${message}</div>
            </div>
          </div>
          <div class="footer">
            Αυτό το email στάλθηκε από τη φόρμα επικοινωνίας του website σας.
          </div>
        </div>
      </body>
      </html>
    `;

    const textContent = `
Νέο Μήνυμα Επικοινωνίας

Όνομα: ${name}
Email: ${email}
${phone ? `Τηλέφωνο: ${phone}` : ''}

Μήνυμα:
${message}

---
Αυτό το email στάλθηκε από τη φόρμα επικοινωνίας του website σας.
    `;

    // Call the send-email function internally
    const { error: emailError } = await supabase.functions.invoke('send-email', {
      body: {
        to: recipientEmail,
        subject: `Νέο μήνυμα από ${name}`,
        html: htmlContent,
        text: textContent,
      },
      headers: {
        'X-Internal-Call': 'true',
      },
    });

    if (emailError) {
      console.error('Error sending email to recipient:', emailError);
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: emailError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Contact form email sent to recipient successfully');

    // Send auto-reply to the sender
    const autoReplyHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; background-color: #0d0d0d; color: #fff8e1; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background-color: #141414; border-radius: 12px; overflow: hidden; border: 1px solid #4a3d1d; }
          .header { background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%); padding: 30px; text-align: center; }
          .header h1 { color: #0d0d0d; margin: 0; font-size: 24px; }
          .content { padding: 30px; }
          .greeting { color: #FFD700; font-size: 18px; margin-bottom: 20px; }
          .message { color: #fff8e1; line-height: 1.6; }
          .footer { padding: 20px; text-align: center; border-top: 1px solid #4a3d1d; color: #a89a6d; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✉️ Ευχαριστούμε για το μήνυμά σας!</h1>
          </div>
          <div class="content">
            <p class="greeting">Αγαπητέ/ή ${name},</p>
            <p class="message">
              Λάβαμε το μήνυμά σας και θα επικοινωνήσουμε μαζί σας το συντομότερο δυνατό.
            </p>
            <p class="message">
              Σας ευχαριστούμε για το ενδιαφέρον σας!
            </p>
            <p class="message" style="margin-top: 30px;">
              Με εκτίμηση,<br>
              <strong style="color: #FFD700;">Η Ομάδα μας</strong>
            </p>
          </div>
          <div class="footer">
            Αυτό είναι ένα αυτόματο email επιβεβαίωσης. Παρακαλούμε μην απαντήσετε σε αυτό το μήνυμα.
          </div>
        </div>
      </body>
      </html>
    `;

    const autoReplyText = `
Αγαπητέ/ή ${name},

Λάβαμε το μήνυμά σας και θα επικοινωνήσουμε μαζί σας το συντομότερο δυνατό.

Σας ευχαριστούμε για το ενδιαφέρον σας!

Με εκτίμηση,
Η Ομάδα μας

---
Αυτό είναι ένα αυτόματο email επιβεβαίωσης.
    `;

    const { error: autoReplyError } = await supabase.functions.invoke('send-email', {
      body: {
        to: email,
        subject: 'Λάβαμε το μήνυμά σας!',
        html: autoReplyHtml,
        text: autoReplyText,
      },
      headers: {
        'X-Internal-Call': 'true',
      },
    });

    if (autoReplyError) {
      console.error('Error sending auto-reply:', autoReplyError);
      // Don't fail the request, just log the error
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
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
