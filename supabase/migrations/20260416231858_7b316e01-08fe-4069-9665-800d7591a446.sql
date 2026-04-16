CREATE POLICY "Users can update their own programs"
ON public.saved_programs
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);