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
  -- Check if this user was created by admin via the admin API
  -- Admin-created users have email_confirmed_at set at creation time
  -- and have created_by_admin flag in app_metadata
  is_admin_created := (NEW.email_confirmed_at IS NOT NULL) OR 
                       COALESCE((NEW.raw_app_meta_data->>'created_by_admin')::boolean, false);
  
  -- Only check signup_enabled for regular signup (not admin-created)
  IF NOT is_admin_created THEN
    SELECT setting_value INTO signup_setting
    FROM public.app_settings
    WHERE setting_key = 'signup_enabled';
    
    IF signup_setting = 'false' THEN
      RAISE EXCEPTION 'User registration is currently disabled';
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