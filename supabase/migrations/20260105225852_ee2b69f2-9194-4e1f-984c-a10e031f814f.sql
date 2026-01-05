-- Add specific_date column to classes for one-time scheduled classes
ALTER TABLE public.classes 
ADD COLUMN IF NOT EXISTS specific_date date NULL;

-- Add notes column to bookings for trainer comments
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS trainer_notes text NULL;

-- Create index for faster queries on specific dates
CREATE INDEX IF NOT EXISTS idx_classes_specific_date ON public.classes(specific_date);

-- Update RLS policy to allow trainers to update booking status
DROP POLICY IF EXISTS "Trainers can update bookings for their classes" ON public.bookings;
CREATE POLICY "Trainers can update bookings for their classes"
ON public.bookings
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'trainer'::app_role) 
  AND class_id IN (
    SELECT id FROM public.classes WHERE trainer_id = auth.uid()
  )
);

-- Allow trainers to view bookings for their classes
DROP POLICY IF EXISTS "Trainers can view bookings for their classes" ON public.bookings;
CREATE POLICY "Trainers can view bookings for their classes"
ON public.bookings
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'trainer'::app_role) 
  AND class_id IN (
    SELECT id FROM public.classes WHERE trainer_id = auth.uid()
  )
);