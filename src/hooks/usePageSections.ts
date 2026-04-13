import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const LIVE_REFRESH_INTERVAL = 2000;

interface PageSection {
  id: string;
  page_key: string;
  section_key: string;
  section_type: string;
  title: string | null;
  subtitle: string | null;
  content: string | null;
  title_en: string | null;
  title_el: string | null;
  subtitle_en: string | null;
  subtitle_el: string | null;
  content_en: string | null;
  content_el: string | null;
  image_url: string | null;
  background_color: string;
  text_color: string;
  settings: any;
  sort_order: number;
  is_visible: boolean;
  updated_at?: string;
}

interface SiteSetting {
  setting_key: string;
  setting_value: string | null;
}

export function usePageSections(pageKey: string) {
  const [sections, setSections] = useState<PageSection[] | null>(null);
  const [siteSettings, setSiteSettings] = useState<SiteSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let isFetching = false;
    
    const loadData = async (showLoader = false) => {
      if (!pageKey) {
        if (!isMounted) return;
        setSections([]);
        setSiteSettings([]);
        setLoading(false);
        setIsInitialized(true);
        return;
      }

      if (isFetching) return;
      isFetching = true;

      if (showLoader) {
        setLoading(true);
      }

      try {
        const [sectionsResult, settingsResult] = await Promise.all([
          supabase
            .from('page_sections')
            .select('*')
            .eq('page_key', pageKey)
            .eq('is_visible', true)
            .order('sort_order'),
          supabase
            .from('site_settings')
            .select('setting_key, setting_value')
        ]);

        if (!isMounted) return;

        if (sectionsResult.error) {
          console.error('Error loading page sections:', sectionsResult.error);
        } else {
          setSections(sectionsResult.data || []);
        }

        if (settingsResult.error) {
          console.error('Error loading site settings:', settingsResult.error);
        } else {
          setSiteSettings(settingsResult.data || []);
        }

        setIsInitialized(true);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
        isFetching = false;
      }
    };

    const refreshData = () => {
      void loadData(false);
    };

    void loadData(true);

    const intervalId = window.setInterval(refreshData, LIVE_REFRESH_INTERVAL);

    const handleFocus = () => refreshData();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshData();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [pageKey]);

  const getSetting = (key: string) => {
    return siteSettings.find(s => s.setting_key === key)?.setting_value || '';
  };

  // Return loading true until we have fetched at least once
  return { 
    sections: sections || [], 
    siteSettings, 
    loading: loading || !isInitialized, 
    getSetting 
  };
}