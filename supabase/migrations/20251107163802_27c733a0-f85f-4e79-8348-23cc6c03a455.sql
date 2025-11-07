-- Drop existing constraint if it exists
ALTER TABLE public.classes 
DROP CONSTRAINT IF EXISTS classes_status_check;

-- Add status column to classes table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'classes' 
    AND column_name = 'status'
  ) THEN
    ALTER TABLE public.classes ADD COLUMN status text NOT NULL DEFAULT 'active';
  END IF;
END $$;

-- Add constraint to ensure valid status values
ALTER TABLE public.classes
ADD CONSTRAINT classes_status_check 
CHECK (status IN ('active', 'cancelled', 'postponed'));

-- Create table to track class cancellations/postponements
CREATE TABLE IF NOT EXISTS public.class_status_changes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  changed_by uuid NOT NULL REFERENCES auth.users(id),
  old_status text NOT NULL,
  new_status text NOT NULL,
  reason text,
  affected_date date,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on class_status_changes
ALTER TABLE public.class_status_changes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Trainers can insert status changes for their classes" ON public.class_status_changes;
DROP POLICY IF EXISTS "Trainers can view status changes for their classes" ON public.class_status_changes;
DROP POLICY IF EXISTS "Admins can manage all status changes" ON public.class_status_changes;

-- Trainers can insert status changes for their classes
CREATE POLICY "Trainers can insert status changes for their classes"
ON public.class_status_changes
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'trainer'::app_role) 
  AND class_id IN (
    SELECT id FROM public.classes WHERE trainer_id = auth.uid()
  )
);

-- Trainers can view status changes for their classes
CREATE POLICY "Trainers can view status changes for their classes"
ON public.class_status_changes
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'trainer'::app_role) 
  AND class_id IN (
    SELECT id FROM public.classes WHERE trainer_id = auth.uid()
  )
);

-- Admins can manage all status changes
CREATE POLICY "Admins can manage all status changes"
ON public.class_status_changes
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));