-- Add trainer to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'trainer';

-- Update RLS policies for classes table to allow trainers to manage their classes
CREATE POLICY "Trainers can insert their own classes"
ON public.classes
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'trainer'::app_role) 
  AND trainer_id = auth.uid()
);

CREATE POLICY "Trainers can update their own classes"
ON public.classes
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'trainer'::app_role) 
  AND trainer_id = auth.uid()
);

CREATE POLICY "Trainers can delete their own classes"
ON public.classes
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'trainer'::app_role) 
  AND trainer_id = auth.uid()
);