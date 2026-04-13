import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Dumbbell, Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { RoleSwitcher } from '@/components/RoleSwitcher';

interface NavigationProps {
  user: any;
  isAdmin: boolean;
}

interface NavPage {
  key: string;
  label: string;
  labelEn?: string;
  labelEl?: string;
  path: string;
}

// Default navigation structure - will be filtered by what exists in DB
const DEFAULT_NAV_PAGES: NavPage[] = [
  { key: 'home', label: 'nav.home', path: '/' },
  { key: 'memberships', label: 'memberships.title', path: '/memberships' },
  { key: 'pricing', label: 'nav.pricing', path: '/pricing' },
  { key: 'contact', label: 'nav.contact', path: '/contact' },
];

// Pages that should always appear in nav (React routes, not page builder pages)
const ALWAYS_SHOW_PAGES = ['home'];

export const Navigation = ({ user, isAdmin }: NavigationProps) => {
  const { t, language, setLanguage } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [navPages, setNavPages] = useState<NavPage[]>([]);
  const [siteName, setSiteName] = useState<string | null>(null);
  const [siteNameColor, setSiteNameColor] = useState<string | null>(null);
  const [siteNameFont, setSiteNameFont] = useState<string | null>(null);
  const [siteNameVisible, setSiteNameVisible] = useState<boolean | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoSize, setLogoSize] = useState<number | null>(null);
  const [navBgColor, setNavBgColor] = useState<string | null>(null);
  const [navTextColor, setNavTextColor] = useState<string | null>(null);
  const [navOpacity, setNavOpacity] = useState<number>(80);
  const [navBlur, setNavBlur] = useState<boolean>(true);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadNavigationPages();
    loadSiteSettings();
  }, []);

  const loadSiteSettings = async () => {
    const { data, error } = await supabase
      .from('site_settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['site_name', 'site_name_color', 'site_name_font', 'site_name_visible', 'logo_url', 'logo_size', 'nav_bg_color', 'nav_text_color', 'nav_opacity', 'nav_blur']);

    if (error) {
      console.error('Error loading site settings:', error);
      // Set defaults on error
      setSiteName('Star Gym');
      setSiteNameVisible(true);
      setLogoSize(32);
      setSettingsLoaded(true);
      return;
    }

    // Set defaults first
    let loadedSiteName = 'Star Gym';
    let loadedVisible = true;
    let loadedSize = 32;
    let loadedColor: string | null = null;
    let loadedFont: string | null = null;
    let loadedLogo: string | null = null;

    data?.forEach(setting => {
      if (setting.setting_key === 'site_name' && setting.setting_value) {
        loadedSiteName = setting.setting_value;
      }
      if (setting.setting_key === 'site_name_color' && setting.setting_value) {
        loadedColor = setting.setting_value;
      }
      if (setting.setting_key === 'site_name_font' && setting.setting_value) {
        loadedFont = setting.setting_value;
      }
      if (setting.setting_key === 'site_name_visible') {
        loadedVisible = setting.setting_value !== 'false';
      }
      if (setting.setting_key === 'logo_url' && setting.setting_value) {
        loadedLogo = setting.setting_value;
      }
      if (setting.setting_key === 'logo_size' && setting.setting_value) {
        loadedSize = parseInt(setting.setting_value) || 32;
      }
    });

    setSiteName(loadedSiteName);
    setSiteNameColor(loadedColor);
    setSiteNameFont(loadedFont);
    setSiteNameVisible(loadedVisible);
    setLogoUrl(loadedLogo);
    setLogoSize(loadedSize);
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

    // Get saved nav config from site_settings (including bilingual page labels)
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
        // Parse bilingual labels: page_{key}_label_en / page_{key}_label_el
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
        // Skip if page doesn't exist (except essential routes)
        if (!existingPageKeys.includes(key) && !ALWAYS_SHOW_PAGES.includes(key)) return;

        const defaultPage = DEFAULT_NAV_PAGES.find(p => p.key === key);
        items.push({
          key,
          label:
            navLabels[key] ||
            defaultPage?.label ||
            key.charAt(0).toUpperCase() + key.slice(1).replace(/-/g, ' '),
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
            label:
              navLabels[key] ||
              defaultPage?.label ||
              key.charAt(0).toUpperCase() + key.slice(1).replace(/-/g, ' '),
            labelEn: pageLabelEn[key],
            labelEl: pageLabelEl[key],
            path: defaultPage?.path || `/page/${key}`,
          });
        }
      });
    } else {
      // No saved order - use default behavior
      DEFAULT_NAV_PAGES.forEach(page => {
        // Always show certain pages even if not in page_sections
        if (existingPageKeys.includes(page.key) || ALWAYS_SHOW_PAGES.includes(page.key)) {
          items.push(page);
        }
      });

      // Add custom pages from Page Builder
      const defaultKeys = DEFAULT_NAV_PAGES.map(p => p.key);
      existingPageKeys.forEach(key => {
        if (!defaultKeys.includes(key)) {
          items.push({
            key,
            label: key
              .split('-')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' '),
            path: `/page/${key}`,
          });
        }
      });
    }

    // Always ensure essential routes exist in nav
    ALWAYS_SHOW_PAGES.forEach((key) => {
      if (navVisibility[key] === false) return;
      const page = DEFAULT_NAV_PAGES.find((p) => p.key === key);
      if (!page) return;
      if (items.find((i) => i.key === key)) return;

      if (key === 'home') {
        items.unshift(page);
        return;
      }

      const homeIndex = items.findIndex((i) => i.key === 'home');
      if (homeIndex >= 0) items.splice(homeIndex + 1, 0, page);
      else items.unshift(page);
    });

    setNavPages(items);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };
  const getPageLabel = (page: NavPage) => {
    if (language === 'el' && page.labelEl) return page.labelEl;
    if (language === 'en' && page.labelEn) return page.labelEn;
    // Fallback: try translation key, then raw label
    const translated = t(page.label);
    return translated !== page.label ? translated : page.label;
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 min-h-[32px]">
            {!settingsLoaded ? (
              <div className="h-8 w-8 bg-muted/50 rounded animate-pulse" />
            ) : logoUrl ? (
              <img 
                src={logoUrl} 
                alt={siteName || 'Logo'} 
                style={{ height: `${logoSize || 32}px` }}
                className="w-auto object-contain" 
              />
            ) : (
              <Dumbbell 
                style={{ height: `${logoSize || 32}px`, width: `${logoSize || 32}px` }}
                className="text-primary" 
              />
            )}
            {!settingsLoaded ? (
              <div className="h-6 w-24 bg-muted/50 rounded animate-pulse" />
            ) : siteNameVisible && siteName && (
              <span 
                className="text-xl font-bold"
                style={{
                  color: siteNameColor || undefined,
                  fontFamily: siteNameFont && siteNameFont !== 'default' ? `'${siteNameFont}', sans-serif` : undefined
                }}
              >
                {siteName}
              </span>
            )}
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navPages.map((page) => (
              <Link 
                key={page.key}
                to={page.path} 
                className="hover:text-primary transition-colors"
              >
                {getPageLabel(page)}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 transition-all hover:scale-105">
                  <span className="text-lg">{language === 'en' ? '🇬🇧' : '🇬🇷'}</span>
                  <span className="font-medium">{language === 'en' ? 'English' : 'Ελληνικά'}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  onClick={() => setLanguage('en')} 
                  className="gap-2 cursor-pointer transition-colors"
                >
                  🇬🇧 English
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setLanguage('el')} 
                  className="gap-2 cursor-pointer transition-colors"
                >
                  🇬🇷 Ελληνικά
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {user ? (
              <>
                <RoleSwitcher userId={user.id} />
                <Button variant="outline" onClick={handleLogout}>
                  {t('nav.logout')}
                </Button>
              </>
            ) : (
              <Button asChild>
                <Link to="/auth">{t('nav.login')}</Link>
              </Button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-card border-t border-border">
          <div className="container mx-auto px-4 py-4 flex flex-col gap-4">
            {navPages.map((page) => (
              <Link 
                key={page.key}
                to={page.path} 
                className="hover:text-primary transition-colors" 
                onClick={() => setMobileMenuOpen(false)}
              >
                {getPageLabel(page)}
              </Link>
            ))}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="justify-start gap-2 w-full transition-all hover:scale-105">
                  <span className="font-medium">{language === 'en' ? '🇬🇧 English' : '🇬🇷 Ελληνικά'}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuItem 
                  onClick={() => { setLanguage('en'); setMobileMenuOpen(false); }} 
                  className="gap-2 cursor-pointer transition-colors"
                >
                  🇬🇧 English
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => { setLanguage('el'); setMobileMenuOpen(false); }} 
                  className="gap-2 cursor-pointer transition-colors"
                >
                  🇬🇷 Ελληνικά
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {user ? (
              <>
                <RoleSwitcher userId={user.id} variant="secondary" />
                <Button variant="outline" onClick={() => { handleLogout(); setMobileMenuOpen(false); }}>
                  {t('nav.logout')}
                </Button>
              </>
            ) : (
              <Button asChild onClick={() => setMobileMenuOpen(false)}>
                <Link to="/auth">{t('nav.login')}</Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};