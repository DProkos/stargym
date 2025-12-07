CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  signup_setting text;
  is_admin_created boolean;
BEGIN
  -- Check if this user was created by admin
  -- The admin API stores metadata in raw_app_meta_data
  is_admin_created := COALESCE(
    (NEW.raw_app_meta_data->>'created_by_admin')::boolean,
    (NEW.raw_user_meta_data->>'created_by_admin')::boolean,
    false
  );
  
  -- Also check if user was created via admin API by checking provider
  -- Admin-created users typically come through admin API
  IF NEW.raw_app_meta_data->>'provider' = 'email' AND 
     NEW.raw_app_meta_data->>'providers' IS NOT NULL THEN
    -- Standard signup flow - check if enabled
    IF NOT is_admin_created THEN
      SELECT setting_value INTO signup_setting
      FROM public.app_settings
      WHERE setting_key = 'signup_enabled';
      
      IF signup_setting = 'false' THEN
        RAISE EXCEPTION 'User registration is currently disabled';
      END IF;
    END IF;
  END IF;
  
  -- Create profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  
  -- Assign member role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'member');
  
  RETURN NEW;
END;
$function$;