-- 1. Add admin-only authorization to cron management functions
CREATE OR REPLACE FUNCTION public.get_cron_jobs()
 RETURNS TABLE(jobid bigint, schedule text, command text, nodename text, nodeport integer, database text, username text, active boolean, jobname text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  RETURN QUERY
  SELECT 
    j.jobid,
    j.schedule,
    j.command,
    j.nodename,
    j.nodeport,
    j.database,
    j.username,
    j.active,
    j.jobname
  FROM cron.job j
  ORDER BY j.jobid;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_cron_schedule(job_id bigint, new_schedule text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  UPDATE cron.job
  SET schedule = new_schedule
  WHERE jobid = job_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_cron_jobs() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.update_cron_schedule(bigint, text) FROM PUBLIC, anon;

-- 2. Restrict email_templates SELECT to authenticated users only (was public)
DROP POLICY IF EXISTS "Anyone can view templates" ON public.email_templates;
CREATE POLICY "Authenticated users can view templates"
ON public.email_templates
FOR SELECT
TO authenticated
USING (true);

-- 3. Remove admin_activity_log from realtime publication (it was exposed without channel auth)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'admin_activity_log'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.admin_activity_log';
  END IF;
END $$;

-- 4. Restrict storage object listing on public buckets so only admins can enumerate files.
-- Public read of individual objects via direct URL still works (CDN-level public access on the bucket).
DROP POLICY IF EXISTS "Admins can list cms-images" ON storage.objects;
CREATE POLICY "Admins can list cms-images"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'cms-images' AND has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can list template-images" ON storage.objects;
CREATE POLICY "Admins can list template-images"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'template-images' AND has_role(auth.uid(), 'admin'::app_role));