import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Facebook, Instagram, Twitter, Phone, Mail, MapPin, Clock } from 'lucide-react';

interface SiteSettings {
  site_name?: string;
  contact_email?: string;
  contact_phone?: string;
  contact_address?: string;
  working_hours?: string;
  working_hours_weekday?: string;
  working_hours_weekend?: string;
  facebook_url?: string;
  instagram_url?: string;
  twitter_url?: string;
  footer_tagline?: string;
}

interface NavPage {
  key: string;
  label: string;
  labelEn?: string;
  labelEl?: string;
  path: string;
}

// Default navigation structure
const DEFAULT_NAV_PAGES: NavPage[] = [
  { key: 'home', label: 'nav.home', path: '/' },
  { key: 'classes', label: 'nav.classes', path: '/classes' },
  { key: 'memberships', label: 'memberships.title', path: '/memberships' },
  { key: 'pricing', label: 'nav.pricing', path: '/pricing' },
  { key: 'contact', label: 'nav.contact', path: '/contact' },
];

export function Footer() {
  const { language, t } = useLanguage();
  const [settings, setSettings] = useState<SiteSettings>({});
  const [navPages, setNavPages] = useState<NavPage[]>([]);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  useEffect(() => {
    fetchSettings();
    loadNavigationPages();
  }, []);

  const fetchSettings = async () => {
    const { data } = await supabase
      .from('site_settings')
      .select('setting_key, setting_value')
      .in('setting_key', [
        'site_name',
        'contact_email',
        'contact_phone',
        'contact_address',
        'working_hours',
        'working_hours_weekday',
        'working_hours_weekend',
        'facebook_url',
        'instagram_url',
        'twitter_url',
        'footer_tagline'
      ]);

    if (data) {
      const settingsObj: SiteSettings = {};
      data.forEach((item) => {
        settingsObj[item.setting_key as keyof SiteSettings] = item.setting_value || '';
      });
      setSettings(settingsObj);
    }
    setSettingsLoaded(true);
  };

  const loadNavigationPages = async () => {
    // Get all unique page keys that have sections in the database
    const { data: pagesData, error } = await supabase
      .from('page_sections')
      .select('page_key')
      .eq('is_visible', true);

    if (error) {
      console.error('Error loading nav pages:', error);
      setNavPages(DEFAULT_NAV_PAGES);
      return;
    }

    const existingPageKeys = [...new Set(pagesData?.map(d => d.page_key) || [])];

    // Get saved nav config from site_settings
    const { data: settingsData } = await supabase
      .from('site_settings')
      .select('setting_key, setting_value')
      .or('setting_key.in.(nav_order,nav_labels,nav_visibility),setting_key.like.page_%_label%');

    let navOrder: string[] = [];
    let navLabels: Record<string, string> = {};
    let navVisibility: Record<string, boolean> = {};
    let pageLabelEn: Record<string, string> = {};
    let pageLabelEl: Record<string, string> = {};

    settingsData?.forEach(setting => {
      try {
        if (setting.setting_key === 'nav_order' && setting.setting_value) {
          navOrder = JSON.parse(setting.setting_value);
        }
        if (setting.setting_key === 'nav_labels' && setting.setting_value) {
          navLabels = JSON.parse(setting.setting_value);
        }
        if (setting.setting_key === 'nav_visibility' && setting.setting_value) {
          navVisibility = JSON.parse(setting.setting_value);
        }
        const labelEnMatch = setting.setting_key.match(/^page_(.+)_label_en$/);
        if (labelEnMatch && setting.setting_value) {
          pageLabelEn[labelEnMatch[1]] = setting.setting_value;
        }
        const labelElMatch = setting.setting_key.match(/^page_(.+)_label_el$/);
        if (labelElMatch && setting.setting_value) {
          pageLabelEl[labelElMatch[1]] = setting.setting_value;
        }
      } catch (e) {
        console.error('Error parsing nav setting:', e);
      }
    });

    // Build nav items list
    const items: NavPage[] = [];
    
    // If we have saved order, use it
    if (navOrder.length > 0) {
      navOrder.forEach(key => {
        // Skip if not visible
        if (navVisibility[key] === false) return;
        // Skip if page doesn't exist
        if (!existingPageKeys.includes(key)) return;
        
        const defaultPage = DEFAULT_NAV_PAGES.find(p => p.key === key);
        items.push({
          key,
          label: navLabels[key] || defaultPage?.label || key.charAt(0).toUpperCase() + key.slice(1).replace(/-/g, ' '),
          labelEn: pageLabelEn[key],
          labelEl: pageLabelEl[key],
          path: defaultPage?.path || `/page/${key}`,
        });
      });

      // Add any new pages not in saved order (if visible)
      existingPageKeys.forEach(key => {
        if (!items.find(i => i.key === key) && navVisibility[key] !== false) {
          const defaultPage = DEFAULT_NAV_PAGES.find(p => p.key === key);
          items.push({
            key,
            label: navLabels[key] || defaultPage?.label || key.charAt(0).toUpperCase() + key.slice(1).replace(/-/g, ' '),
            labelEn: pageLabelEn[key],
            labelEl: pageLabelEl[key],
            path: defaultPage?.path || `/page/${key}`,
          });
        }
      });
    } else {
      // No saved order - use default behavior
      DEFAULT_NAV_PAGES.forEach(page => {
        if (existingPageKeys.includes(page.key)) {
          items.push(page);
        }
      });

      // Always include home if it doesn't exist
      if (!items.find(p => p.key === 'home')) {
        items.unshift(DEFAULT_NAV_PAGES[0]);
      }

      // Add custom pages from Page Builder
      const defaultKeys = DEFAULT_NAV_PAGES.map(p => p.key);
      existingPageKeys.forEach(key => {
        if (!defaultKeys.includes(key)) {
          items.push({
            key,
            label: key.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
            labelEn: pageLabelEn[key],
            labelEl: pageLabelEl[key],
            path: `/page/${key}`
          });
        }
      });
    }

    setNavPages(items);
  };

  const ensureHttps = (url: string | undefined) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `https://${url}`;
  };

  const handleSocialClick = (url: string | undefined) => (e: React.MouseEvent) => {
    e.preventDefault();
    if (url) {
      window.open(ensureHttps(url), '_blank', 'noopener,noreferrer');
    }
  };

  const hasSocial = settings.facebook_url || settings.instagram_url || settings.twitter_url;
  const hasContact = settings.contact_phone || settings.contact_email || settings.contact_address;
  const hasWorkingHours = settings.working_hours || settings.working_hours_weekday || settings.working_hours_weekend;

  const getWorkingHours = () => {
    if (settings.working_hours) return settings.working_hours;
    const parts = [];
    if (settings.working_hours_weekday) parts.push(settings.working_hours_weekday);
    if (settings.working_hours_weekend) parts.push(settings.working_hours_weekend);
    return parts.join('\n');
  };

  const defaultTagline = language === 'el' 
    ? 'Το γυμναστήριο που θα αλλάξει τη ζωή σου. Ελάτε να γνωριστούμε!'
    : 'The gym that will change your life. Come meet us!';

  return (
    <footer className="bg-card border-t border-border">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand / About */}
          <div>
            {!settingsLoaded ? (
              <>
                <div className="h-7 w-32 bg-muted/50 rounded animate-pulse mb-4" />
                <div className="h-4 w-full bg-muted/50 rounded animate-pulse" />
                <div className="h-4 w-3/4 bg-muted/50 rounded animate-pulse mt-2" />
              </>
            ) : (
              <>
                <h3 className="text-xl font-bold text-primary mb-4">
                  {settings.site_name || 'Star Gym'}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {settings.footer_tagline || defaultTagline}
                </p>
              </>
            )}
          </div>

          {/* Quick Links - Same as Navigation */}
          <div>
            <h4 className="font-semibold mb-4">
              {language === 'el' ? 'Σύνδεσμοι' : 'Quick Links'}
            </h4>
            <ul className="space-y-2 text-sm">
              {navPages.map((page) => (
                <li key={page.key}>
                  <Link 
                    to={page.path} 
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    {t(page.label)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          {(hasContact || hasWorkingHours) && (
            <div>
              <h4 className="font-semibold mb-4">
                {language === 'el' ? 'Επικοινωνία' : 'Contact'}
              </h4>
              <ul className="space-y-3 text-sm">
                {settings.contact_phone && (
                  <li className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4 text-primary flex-shrink-0" />
                    <a 
                      href={`tel:${settings.contact_phone}`}
                      className="hover:text-primary transition-colors"
                    >
                      {settings.contact_phone}
                    </a>
                  </li>
                )}
                {settings.contact_email && (
                  <li className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4 text-primary flex-shrink-0" />
                    <a 
                      href={`mailto:${settings.contact_email}`}
                      className="hover:text-primary transition-colors"
                    >
                      {settings.contact_email}
                    </a>
                  </li>
                )}
                {settings.contact_address && (
                  <li className="flex items-start gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                    <span>{settings.contact_address}</span>
                  </li>
                )}
                {hasWorkingHours && (
                  <li className="flex items-start gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                    <span className="whitespace-pre-line">{getWorkingHours()}</span>
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Social Media */}
          {hasSocial && (
            <div>
              <h4 className="font-semibold mb-4">
                {language === 'el' ? 'Social Media' : 'Follow Us'}
              </h4>
              <div className="flex gap-3">
                {settings.facebook_url && (
                  <a
                    href={ensureHttps(settings.facebook_url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    referrerPolicy="no-referrer"
                    onClick={handleSocialClick(settings.facebook_url)}
                    className="p-2 bg-secondary rounded-full hover:bg-primary hover:text-primary-foreground transition-colors"
                    aria-label="Facebook"
                  >
                    <Facebook className="h-5 w-5" />
                  </a>
                )}
                {settings.instagram_url && (
                  <a
                    href={ensureHttps(settings.instagram_url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    referrerPolicy="no-referrer"
                    onClick={handleSocialClick(settings.instagram_url)}
                    className="p-2 bg-secondary rounded-full hover:bg-primary hover:text-primary-foreground transition-colors"
                    aria-label="Instagram"
                  >
                    <Instagram className="h-5 w-5" />
                  </a>
                )}
                {settings.twitter_url && (
                  <a
                    href={ensureHttps(settings.twitter_url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    referrerPolicy="no-referrer"
                    onClick={handleSocialClick(settings.twitter_url)}
                    className="p-2 bg-secondary rounded-full hover:bg-primary hover:text-primary-foreground transition-colors"
                    aria-label="Twitter"
                  >
                    <Twitter className="h-5 w-5" />
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Bar */}
        <div className="mt-10 pt-6 border-t border-border text-center text-sm text-muted-foreground">
          <p>
            © {new Date().getFullYear()} {settings.site_name || 'Star Gym'}. 
            {language === 'el' ? ' Με επιφύλαξη παντός δικαιώματος.' : ' All rights reserved.'}
          </p>
        </div>
      </div>
    </footer>
  );
}
