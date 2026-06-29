
-- 1. email_verification_codes: remove user UPDATE policy (bypasses verification)
DROP POLICY IF EXISTS "Users can update their own verification codes" ON public.email_verification_codes;

-- 2. user_subscriptions: remove user self-insert policy (payment bypass)
DROP POLICY IF EXISTS "Users can insert their own subscriptions" ON public.user_subscriptions;

-- 3. app_settings: ensure no anon access, explicit admin-only
REVOKE ALL ON public.app_settings FROM anon;
REVOKE ALL ON public.app_settings FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;

-- 4. password_reset_tokens: confirm no client access; revoke from anon/authenticated
REVOKE ALL ON public.password_reset_tokens FROM anon;
REVOKE ALL ON public.password_reset_tokens FROM authenticated;
GRANT ALL ON public.password_reset_tokens TO service_role;

-- 5. SECURITY DEFINER functions: revoke EXECUTE from anon/public where not needed.
-- Keep authenticated EXECUTE only on functions that are intentionally callable from the app
-- (with internal role checks). Trigger / admin-cron functions are revoked entirely.

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.refresh_campaign_analytics() FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.get_cron_jobs() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.update_cron_schedule(bigint, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.generate_invoice_number() FROM PUBLIC, anon;

-- has_role must remain executable by authenticated (used inside RLS policies)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
