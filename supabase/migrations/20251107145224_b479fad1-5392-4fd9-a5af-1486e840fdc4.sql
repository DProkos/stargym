-- Create email verification codes table
CREATE TABLE IF NOT EXISTS public.email_verification_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  code TEXT NOT NULL,
  email TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_verification_codes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_verification_codes
CREATE POLICY "Users can view their own verification codes"
  ON public.email_verification_codes
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own verification codes"
  ON public.email_verification_codes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own verification codes"
  ON public.email_verification_codes
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all verification codes"
  ON public.email_verification_codes
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create newsletter subscribers table
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  subscribed BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  unsubscribed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for newsletter_subscribers
CREATE POLICY "Anyone can subscribe to newsletter"
  ON public.newsletter_subscribers
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view all subscribers"
  ON public.newsletter_subscribers
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage subscribers"
  ON public.newsletter_subscribers
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert SMTP settings into app_settings
INSERT INTO public.app_settings (setting_key, setting_value, description, is_sensitive, setting_type)
VALUES 
  ('smtp_host', '', 'SMTP server host', false, 'string'),
  ('smtp_port', '587', 'SMTP server port', false, 'number'),
  ('smtp_secure', 'false', 'Use TLS/SSL', false, 'boolean'),
  ('smtp_user', '', 'SMTP username', false, 'string'),
  ('smtp_password', '', 'SMTP password', true, 'string'),
  ('smtp_from_email', '', 'From email address', false, 'string'),
  ('smtp_from_name', 'My Gym', 'From name', false, 'string')
ON CONFLICT (setting_key) DO NOTHING;