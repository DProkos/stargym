-- Create waitlist table
CREATE TABLE public.waitlist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  booking_date DATE NOT NULL,
  position INTEGER NOT NULL,
  notified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, class_id, booking_date)
);

-- Enable RLS
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Create policies for waitlist
CREATE POLICY "Users can view their own waitlist entries"
  ON public.waitlist
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own waitlist entries"
  ON public.waitlist
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own waitlist entries"
  ON public.waitlist
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all waitlist entries"
  ON public.waitlist
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for performance
CREATE INDEX idx_waitlist_class_date ON public.waitlist(class_id, booking_date, position);

-- Function to automatically assign position
CREATE OR REPLACE FUNCTION public.assign_waitlist_position()
RETURNS TRIGGER AS $$
BEGIN
  -- Get the next position for this class and date
  SELECT COALESCE(MAX(position), 0) + 1
  INTO NEW.position
  FROM public.waitlist
  WHERE class_id = NEW.class_id
    AND booking_date = NEW.booking_date;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to assign position before insert
CREATE TRIGGER set_waitlist_position
  BEFORE INSERT ON public.waitlist
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_waitlist_position();