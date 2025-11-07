-- Update RLS policies for trainers to view their own classes
CREATE POLICY "Trainers can view their assigned classes"
ON public.classes
FOR SELECT
USING (
  has_role(auth.uid(), 'trainer'::app_role) 
  AND trainer_id = auth.uid()
);

-- Allow trainers to view bookings for their classes
CREATE POLICY "Trainers can view bookings for their classes"
ON public.bookings
FOR SELECT
USING (
  has_role(auth.uid(), 'trainer'::app_role)
  AND class_id IN (
    SELECT id FROM public.classes WHERE trainer_id = auth.uid()
  )
);

-- Allow trainers to update their own trainer profile
CREATE POLICY "Trainers can update their own profile"
ON public.trainers
FOR UPDATE
USING (id = auth.uid());

CREATE POLICY "Trainers can view their own profile"
ON public.trainers
FOR SELECT
USING (id = auth.uid());