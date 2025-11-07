-- Create settings table for storing application configuration
CREATE TABLE IF NOT EXISTS public.app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT,
  setting_type TEXT DEFAULT 'string',
  is_sensitive BOOLEAN DEFAULT false,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can view and modify settings
CREATE POLICY "Admins can manage app settings"
  ON public.app_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Add trigger for updated_at
CREATE TRIGGER update_app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default reCAPTCHA settings (empty values to be filled by admin)
INSERT INTO public.app_settings (setting_key, setting_value, setting_type, is_sensitive, description)
VALUES 
  ('recaptcha_site_key', '', 'string', false, 'Google reCAPTCHA v3 Site Key'),
  ('recaptcha_secret_key', '', 'string', true, 'Google reCAPTCHA v3 Secret Key')
ON CONFLICT (setting_key) DO NOTHING;