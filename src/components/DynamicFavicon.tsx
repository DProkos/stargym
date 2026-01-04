import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function DynamicFavicon() {
  const [faviconUrl, setFaviconUrl] = useState<string | null>(null);

  useEffect(() => {
    loadFavicon();
  }, []);

  useEffect(() => {
    if (faviconUrl) {
      updateFavicon(faviconUrl);
    }
  }, [faviconUrl]);

  const loadFavicon = async () => {
    const { data, error } = await supabase
      .from('site_settings')
      .select('setting_value')
      .eq('setting_key', 'favicon_url')
      .maybeSingle();

    if (!error && data?.setting_value) {
      setFaviconUrl(data.setting_value);
    }
  };

  const updateFavicon = (url: string) => {
    // Remove existing favicon links
    const existingLinks = document.querySelectorAll('link[rel*="icon"]');
    existingLinks.forEach(link => link.remove());

    // Create new favicon link
    const link = document.createElement('link');
    link.rel = 'icon';
    link.type = url.endsWith('.svg') ? 'image/svg+xml' : 'image/png';
    link.href = url;
    document.head.appendChild(link);

    // Also add apple-touch-icon for iOS
    const appleLink = document.createElement('link');
    appleLink.rel = 'apple-touch-icon';
    appleLink.href = url;
    document.head.appendChild(appleLink);
  };

  return null;
}
