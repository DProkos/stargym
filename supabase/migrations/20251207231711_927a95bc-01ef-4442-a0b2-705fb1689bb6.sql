-- Remove the dangerous public SELECT policy from password_reset_tokens
-- The edge function uses service role key and doesn't need public read access
DROP POLICY IF EXISTS "Anyone can read tokens for validation" ON password_reset_tokens;