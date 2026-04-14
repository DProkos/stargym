
CREATE TABLE public.saved_programs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  program_type TEXT NOT NULL DEFAULT 'workout',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own programs"
ON public.saved_programs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own programs"
ON public.saved_programs FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own programs"
ON public.saved_programs FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all programs"
ON public.saved_programs FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));
