-- Create table for tracking individual email events
CREATE TABLE public.email_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.newsletter_campaigns(id) ON DELETE CASCADE,
  subscriber_email text NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('sent', 'opened', 'clicked', 'bounced', 'unsubscribed')),
  event_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create index for faster queries
CREATE INDEX idx_email_events_campaign_id ON public.email_events(campaign_id);
CREATE INDEX idx_email_events_subscriber_email ON public.email_events(subscriber_email);
CREATE INDEX idx_email_events_event_type ON public.email_events(event_type);
CREATE INDEX idx_email_events_created_at ON public.email_events(created_at);

-- Enable RLS
ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;

-- Admins can manage all events
CREATE POLICY "Admins can manage email events"
ON public.email_events
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Public insert for tracking (will be called from edge functions)
CREATE POLICY "Allow public insert for tracking"
ON public.email_events
FOR INSERT
WITH CHECK (true);

-- Create materialized view for campaign analytics (for better performance)
CREATE MATERIALIZED VIEW public.campaign_analytics AS
SELECT 
  c.id as campaign_id,
  c.title,
  c.sent_count,
  c.sent_at,
  COUNT(DISTINCT CASE WHEN e.event_type = 'opened' THEN e.subscriber_email END) as unique_opens,
  COUNT(CASE WHEN e.event_type = 'opened' THEN 1 END) as total_opens,
  COUNT(DISTINCT CASE WHEN e.event_type = 'clicked' THEN e.subscriber_email END) as unique_clicks,
  COUNT(CASE WHEN e.event_type = 'clicked' THEN 1 END) as total_clicks,
  COUNT(CASE WHEN e.event_type = 'bounced' THEN 1 END) as bounces,
  COUNT(CASE WHEN e.event_type = 'unsubscribed' THEN 1 END) as unsubscribes,
  CASE 
    WHEN c.sent_count > 0 THEN 
      ROUND((COUNT(DISTINCT CASE WHEN e.event_type = 'opened' THEN e.subscriber_email END)::numeric / c.sent_count) * 100, 2)
    ELSE 0 
  END as open_rate,
  CASE 
    WHEN COUNT(DISTINCT CASE WHEN e.event_type = 'opened' THEN e.subscriber_email END) > 0 THEN 
      ROUND((COUNT(DISTINCT CASE WHEN e.event_type = 'clicked' THEN e.subscriber_email END)::numeric / 
        COUNT(DISTINCT CASE WHEN e.event_type = 'opened' THEN e.subscriber_email END)) * 100, 2)
    ELSE 0 
  END as click_through_rate
FROM public.newsletter_campaigns c
LEFT JOIN public.email_events e ON c.id = e.campaign_id
WHERE c.status = 'sent'
GROUP BY c.id, c.title, c.sent_count, c.sent_at;

-- Create index on materialized view
CREATE UNIQUE INDEX idx_campaign_analytics_campaign_id ON public.campaign_analytics(campaign_id);

-- Function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_campaign_analytics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.campaign_analytics;
END;
$$;

-- Add tracking_id to newsletter_campaigns for unique tracking links
ALTER TABLE public.newsletter_campaigns 
ADD COLUMN IF NOT EXISTS tracking_id text UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex');