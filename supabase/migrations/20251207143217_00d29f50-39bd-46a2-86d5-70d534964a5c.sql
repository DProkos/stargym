-- Create page_sections table for the page builder
CREATE TABLE public.page_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_key TEXT NOT NULL, -- 'home', 'contact', 'classes', 'memberships', 'pricing'
  section_key TEXT NOT NULL, -- unique identifier within page
  section_type TEXT NOT NULL, -- 'hero', 'features', 'cta', 'cards', 'text', 'image', 'contact_form', 'pricing_table'
  title TEXT,
  subtitle TEXT,
  content TEXT,
  image_url TEXT,
  background_color TEXT DEFAULT 'default', -- 'default', 'primary', 'secondary', 'gradient'
  text_color TEXT DEFAULT 'default',
  settings JSONB DEFAULT '{}', -- additional settings like button_text, button_link, etc.
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(page_key, section_key)
);

-- Create site_settings table for global settings (logo, colors, etc.)
CREATE TABLE public.site_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT,
  setting_type TEXT DEFAULT 'text', -- 'text', 'image', 'color', 'json'
  category TEXT DEFAULT 'general', -- 'branding', 'colors', 'general'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.page_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for page_sections
CREATE POLICY "Anyone can view visible page sections" 
ON public.page_sections 
FOR SELECT 
USING (is_visible = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage page sections" 
ON public.page_sections 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for site_settings
CREATE POLICY "Anyone can view site settings" 
ON public.site_settings 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage site settings" 
ON public.site_settings 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert default site settings
INSERT INTO public.site_settings (setting_key, setting_value, setting_type, category) VALUES
('site_name', 'Star Gym', 'text', 'branding'),
('logo_url', NULL, 'image', 'branding'),
('primary_color', '#667eea', 'color', 'colors'),
('accent_color', '#764ba2', 'color', 'colors'),
('secondary_color', '#1a1a2e', 'color', 'colors'),
('contact_email', 'info@stargym.gr', 'text', 'general'),
('contact_phone', '+30 210 123 4567', 'text', 'general'),
('contact_address', '123 Fitness Street, Athens, 10431, Greece', 'text', 'general'),
('working_hours_weekday', 'Monday - Friday: 6:00 AM - 11:00 PM', 'text', 'general'),
('working_hours_weekend', 'Saturday - Sunday: 8:00 AM - 9:00 PM', 'text', 'general');

-- Insert default home page sections
INSERT INTO public.page_sections (page_key, section_key, section_type, title, subtitle, content, background_color, sort_order, settings) VALUES
('home', 'hero', 'hero', 'Transform Your Body, Transform Your Life', 'Join the best gym in town and start your fitness journey today', NULL, 'gradient', 0, '{"button_text": "Get Started", "button_link": "/auth", "button_text_2": "View Classes", "button_link_2": "/classes"}'),
('home', 'features', 'features', 'Why Choose Us?', 'Everything you need for your fitness journey', NULL, 'default', 1, '{"features": [{"icon": "Dumbbell", "title": "Modern Equipment", "description": "State-of-the-art equipment for all your workout needs"}, {"icon": "Users", "title": "Expert Trainers", "description": "Certified professionals to guide your journey"}, {"icon": "Award", "title": "Proven Results", "description": "Join thousands who achieved their fitness goals"}, {"icon": "Clock", "title": "24/7 Access", "description": "Work out on your schedule, any time"}]}'),
('home', 'cta', 'cta', 'Ready to Transform?', 'Join thousands of members who have already started their fitness journey', NULL, 'gradient', 2, '{"button_text": "Start Now", "button_link": "/auth"}'),
('contact', 'header', 'header', 'Contact Us', 'Get in touch with us', NULL, 'default', 0, '{}'),
('contact', 'form', 'contact_form', 'Send us a message', NULL, NULL, 'default', 1, '{}'),
('contact', 'info', 'contact_info', NULL, NULL, NULL, 'default', 2, '{}'),
('classes', 'header', 'header', 'Our Classes', 'Find the perfect class for your fitness level', NULL, 'default', 0, '{}'),
('memberships', 'header', 'header', 'Membership Plans', 'Choose the perfect plan for your fitness journey', NULL, 'default', 0, '{}'),
('pricing', 'header', 'header', 'Pricing Plans', 'Simple, transparent pricing for everyone', NULL, 'default', 0, '{}');

-- Create updated_at trigger
CREATE TRIGGER update_page_sections_updated_at
BEFORE UPDATE ON public.page_sections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_site_settings_updated_at
BEFORE UPDATE ON public.site_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();