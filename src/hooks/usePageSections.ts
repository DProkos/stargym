import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
    
    const loadData = async () => {
      setLoading(true);
      
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

      if (sectionsResult.data) {
        setSections(sectionsResult.data);
      } else {
        setSections([]);
      }
      
      if (settingsResult.data) {
        setSiteSettings(settingsResult.data);
      }
      
      setLoading(false);
      setIsInitialized(true);
    };

    loadData();
    
    return () => {
      isMounted = false;
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