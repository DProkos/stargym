import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { z } from 'npm:zod@3.23.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const massEmailSchema = z.object({
  campaignId: z.string().uuid({ message: "Invalid campaign ID format" }),
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseClient = createClient(supabaseUrl, token);
    
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
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
      console.error('Unauthorized mass email attempt by user:', user.id);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate input
    const requestBody = await req.json();
    const validationResult = massEmailSchema.safeParse(requestBody);
    
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid input', details: validationResult.error.format() }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { campaignId } = validationResult.data;

    // Get campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from('newsletter_campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      return new Response(
        JSON.stringify({ error: 'Campaign not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all active subscribers
    const { data: subscribers, error: subscribersError } = await supabase
      .from('newsletter_subscribers')
      .select('email, name')
      .eq('subscribed', true);

    if (subscribersError) {
      console.error('Failed to fetch subscribers:', subscribersError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch subscribers' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
      console.error('Failed to fetch SMTP settings:', settingsError);
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

    console.log(`Starting mass email campaign ${campaignId} by admin ${user.id} to ${subscribers.length} subscribers`);

    // Start background task for sending emails
    const sendEmailsTask = async () => {
      let sentCount = 0;
      const batchSize = 50;

      for (let i = 0; i < subscribers.length; i += batchSize) {
        const batch = subscribers.slice(i, i + batchSize);
        
        for (const subscriber of batch) {
          try {
            const personalizedHtml = campaign.html_content
              .replace(/\{name\}/g, subscriber.name || 'Subscriber')
              .replace(/\{email\}/g, subscriber.email);

            const personalizedText = campaign.text_content
              ?.replace(/\{name\}/g, subscriber.name || 'Subscriber')
              .replace(/\{email\}/g, subscriber.email);

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
            
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (error) {
            console.error(`Failed to send to ${subscriber.email}:`, error);
          }
        }

        if (i + batchSize < subscribers.length) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

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

    sendEmailsTask();

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
      JSON.stringify({ error: 'Failed to start mass email campaign' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
