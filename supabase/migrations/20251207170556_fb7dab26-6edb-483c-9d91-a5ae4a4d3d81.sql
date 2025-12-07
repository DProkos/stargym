-- Fix function search path for update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- Fix function search path for assign_waitlist_position
CREATE OR REPLACE FUNCTION public.assign_waitlist_position()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  -- Get the next position for this class and date
  SELECT COALESCE(MAX(position), 0) + 1
  INTO NEW.position
  FROM public.waitlist
  WHERE class_id = NEW.class_id
    AND booking_date = NEW.booking_date;
  
  RETURN NEW;
END;
$function$;