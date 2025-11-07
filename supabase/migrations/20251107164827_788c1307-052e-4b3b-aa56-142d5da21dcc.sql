-- Create table for password change verification codes
CREATE TABLE IF NOT EXISTS public.password_change_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL,
  verified boolean NOT NULL DEFAULT false,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on password_change_codes
ALTER TABLE public.password_change_codes ENABLE ROW LEVEL SECURITY;

-- Users can view their own codes
CREATE POLICY "Users can view their own password change codes"
ON public.password_change_codes
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can insert their own codes
CREATE POLICY "Users can insert their own password change codes"
ON public.password_change_codes
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own codes
CREATE POLICY "Users can update their own password change codes"
ON public.password_change_codes
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_password_change_codes_user_id ON public.password_change_codes(user_id);
CREATE INDEX idx_password_change_codes_expires_at ON public.password_change_codes(expires_at);