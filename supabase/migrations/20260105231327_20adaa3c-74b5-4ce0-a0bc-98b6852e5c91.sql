-- Create class_schedules table for multiple day/time entries per class
CREATE TABLE public.class_schedules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  time time NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.class_schedules ENABLE ROW LEVEL SECURITY;

-- Policies for class_schedules
CREATE POLICY "Anyone can view class schedules"
ON public.class_schedules
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Trainers can manage their class schedules"
ON public.class_schedules
FOR ALL
TO authenticated
USING (
  class_id IN (SELECT id FROM public.classes WHERE trainer_id = auth.uid())
)
WITH CHECK (
  class_id IN (SELECT id FROM public.classes WHERE trainer_id = auth.uid())
);

CREATE POLICY "Admins can manage all class schedules"
ON public.class_schedules
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster lookups
CREATE INDEX idx_class_schedules_class_id ON public.class_schedules(class_id);
CREATE INDEX idx_class_schedules_day_of_week ON public.class_schedules(day_of_week);