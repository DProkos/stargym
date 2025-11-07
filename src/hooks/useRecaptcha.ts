import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

declare global {
  interface Window {
    grecaptcha: any;
  }
}

export function useRecaptcha() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [siteKey, setSiteKey] = useState<string | null>(null);

  useEffect(() => {
    const loadRecaptcha = async () => {
      try {
        // Fetch site key from settings
        const { data, error } = await supabase
          .from('app_settings')
          .select('setting_value')
          .eq('setting_key', 'recaptcha_site_key')
          .single();

        if (error || !data?.setting_value) {
          console.warn('reCAPTCHA site key not configured');
          return;
        }

        const key = data.setting_value;
        setSiteKey(key);

        // Load reCAPTCHA script
        if (!document.querySelector('script[src*="recaptcha"]')) {
          const script = document.createElement('script');
          script.src = `https://www.google.com/recaptcha/api.js?render=${key}`;
          script.async = true;
          script.defer = true;
          script.onload = () => setIsLoaded(true);
          document.head.appendChild(script);
        } else {
          setIsLoaded(true);
        }
      } catch (err) {
        console.error('Failed to load reCAPTCHA:', err);
      }
    };

    loadRecaptcha();
  }, []);

  const executeRecaptcha = async (action: string): Promise<string | null> => {
    if (!isLoaded || !siteKey) {
      console.warn('reCAPTCHA not loaded or configured');
      return null;
    }

    try {
      return await new Promise((resolve) => {
        window.grecaptcha.ready(() => {
          window.grecaptcha
            .execute(siteKey, { action })
            .then((token: string) => resolve(token))
            .catch(() => resolve(null));
        });
      });
    } catch (error) {
      console.error('Failed to execute reCAPTCHA:', error);
      return null;
    }
  };

  const verifyRecaptcha = async (token: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke('verify-recaptcha', {
        body: { token },
      });

      if (error) {
        console.error('reCAPTCHA verification error:', error);
        return false;
      }

      return data?.success && data?.score >= 0.5;
    } catch (error) {
      console.error('Failed to verify reCAPTCHA:', error);
      return false;
    }
  };

  return {
    isLoaded,
    executeRecaptcha,
    verifyRecaptcha,
  };
}