
-- AI Coach usage log: one row per request
CREATE TABLE public.ai_coach_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_coach_usage_user_created ON public.ai_coach_usage(user_id, created_at DESC);
CREATE INDEX idx_ai_coach_usage_created ON public.ai_coach_usage(created_at DESC);

ALTER TABLE public.ai_coach_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage"
ON public.ai_coach_usage FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all usage"
ON public.ai_coach_usage FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Track which monthly threshold alerts have been sent (prevents duplicate emails)
CREATE TABLE public.ai_coach_alerts_sent (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  year_month TEXT NOT NULL,
  threshold INTEGER NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(year_month, threshold)
);

ALTER TABLE public.ai_coach_alerts_sent ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view alerts"
ON public.ai_coach_alerts_sent FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- App settings for AI Coach budget config (defaults inserted)
INSERT INTO public.app_settings (setting_key, setting_value, setting_type, description)
VALUES
  ('ai_coach_daily_limit', '5', 'number', 'Max AI Coach requests per user per day'),
  ('ai_coach_monthly_limit', '30', 'number', 'Max AI Coach requests per user per month'),
  ('ai_coach_monthly_budget_requests', '1650', 'number', 'Estimated total AI Coach requests covered by monthly Lovable AI budget')
ON CONFLICT (setting_key) DO NOTHING;
