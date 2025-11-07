import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MassEmailRequest {
  campaignId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { campaignId }: MassEmailRequest = await req.json();

    // Get campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from('newsletter_campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      throw new Error('Campaign not found');
    }

    // Get all active subscribers
    const { data: subscribers, error: subscribersError } = await supabase
      .from('newsletter_subscribers')
      .select('email, name')
      .eq('subscribed', true);

    if (subscribersError) {
      throw new Error('Failed to fetch subscribers');
    }

    // Get SMTP settings
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
      throw new Error('Failed to fetch SMTP settings');
    }

    const smtpConfig: Record<string, string> = {};
    settings?.forEach((s) => {
      smtpConfig[s.setting_key] = s.setting_value || '';
    });

    if (!smtpConfig.smtp_host || !smtpConfig.smtp_user || !smtpConfig.smtp_password) {
      throw new Error('SMTP not configured');
    }

    // Start background task for sending emails
    const sendEmailsTask = async () => {
      let sentCount = 0;
      const batchSize = 50; // Send in batches to avoid rate limits

      for (let i = 0; i < subscribers.length; i += batchSize) {
        const batch = subscribers.slice(i, i + batchSize);
        
        for (const subscriber of batch) {
          try {
            // Personalize content
            const personalizedHtml = campaign.html_content
              .replace(/\{name\}/g, subscriber.name || 'Subscriber')
              .replace(/\{email\}/g, subscriber.email);

            const personalizedText = campaign.text_content
              ?.replace(/\{name\}/g, subscriber.name || 'Subscriber')
              .replace(/\{email\}/g, subscriber.email);

            // Call send-email function
            await supabase.functions.invoke('send-email', {
              body: {
                to: subscriber.email,
                subject: campaign.subject,
                html: personalizedHtml,
                text: personalizedText,
              },
            });

            sentCount++;
            console.log(`Sent email ${sentCount}/${subscribers.length} to ${subscriber.email}`);
            
            // Small delay to avoid overwhelming the SMTP server
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (error) {
            console.error(`Failed to send to ${subscriber.email}:`, error);
          }
        }

        // Delay between batches
        if (i + batchSize < subscribers.length) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      // Update campaign status
      await supabase
        .from('newsletter_campaigns')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          sent_count: sentCount,
        })
        .eq('id', campaignId);

      console.log(`Campaign ${campaignId} completed. Sent ${sentCount}/${subscribers.length} emails`);
    };

    // Start background task for sending emails (run in background)
    sendEmailsTask();

    // Return immediate response
    return new Response(
      JSON.stringify({
        success: true,
        message: `Sending emails to ${subscribers.length} subscribers in background`,
        subscriberCount: subscribers.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error starting mass email:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
