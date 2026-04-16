INSERT INTO public.app_settings (setting_key, setting_value, setting_type, is_sensitive, description)
VALUES ('pwa_install_prompt_enabled', 'true', 'boolean', false, 'Show PWA install prompt banner to mobile users')
ON CONFLICT (setting_key) DO NOTHING;