-- Create content_blocks table for general website content
CREATE TABLE public.content_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  title TEXT,
  content TEXT,
  image_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on content_blocks
ALTER TABLE public.content_blocks ENABLE ROW LEVEL SECURITY;

-- Anyone can view content blocks
CREATE POLICY "Anyone can view content blocks"
ON public.content_blocks
FOR SELECT
USING (true);

-- Admins can manage content blocks
CREATE POLICY "Admins can manage content blocks"
ON public.content_blocks
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_content_blocks_updated_at
BEFORE UPDATE ON public.content_blocks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default content blocks
INSERT INTO public.content_blocks (key, title, content, metadata) VALUES
('hero_title', 'Transform Your Body', 'Transform Your Body', '{"section": "hero"}'::jsonb),
('hero_subtitle', 'Elite fitness training', 'Elite fitness training with world-class facilities', '{"section": "hero"}'::jsonb),
('about_title', 'World-Class Facilities', 'World-Class Facilities', '{"section": "about"}'::jsonb),
('about_description', 'State-of-the-art equipment', 'State-of-the-art equipment, expert trainers, and a supportive community', '{"section": "about"}'::jsonb),
('contact_address', 'Gym Address', '123 Fitness Street, Athens, Greece', '{"section": "contact"}'::jsonb),
('contact_phone', 'Phone', '+30 123 456 7890', '{"section": "contact"}'::jsonb),
('contact_email', 'Email', 'info@gympro.com', '{"section": "contact"}'::jsonb),
('hours_weekday', 'Weekday Hours', 'Monday - Friday: 6:00 AM - 10:00 PM', '{"section": "hours"}'::jsonb),
('hours_weekend', 'Weekend Hours', 'Saturday - Sunday: 8:00 AM - 8:00 PM', '{"section": "hours"}'::jsonb);

-- Update trainers table to allow admin management
CREATE POLICY "Admins can insert trainers"
ON public.trainers
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete trainers"
ON public.trainers
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Update classes to allow admin full management  
CREATE POLICY "Admins can insert classes"
ON public.classes
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete classes"
ON public.classes
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));