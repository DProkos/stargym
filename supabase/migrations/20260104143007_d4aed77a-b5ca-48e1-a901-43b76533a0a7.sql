-- Fix: Replace overly permissive public insert policy with token-validated policy
-- This ensures only valid tracking events with matching campaign tracking_id can be inserted

-- Drop the current permissive policy
DROP POLICY IF EXISTS "Allow public insert for tracking" ON public.email_events;

-- Create a new policy that validates tracking_token against campaign tracking_id
CREATE POLICY "Validated tracking inserts only" 
  ON public.email_events
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM public.newsletter_campaigns 
      WHERE newsletter_campaigns.id = email_events.campaign_id 
        AND newsletter_campaigns.tracking_id = (email_events.event_data->>'tracking_token')
    )
  );