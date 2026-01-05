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
  path: string;
}

// Default navigation structure - will be filtered by what exists in DB
const DEFAULT_NAV_PAGES: NavPage[] = [
  { key: 'home', label: 'nav.home', path: '/' },
  { key: 'classes', label: 'nav.classes', path: '/classes' },
  { key: 'memberships', label: 'memberships.title', path: '/memberships' },
  { key: 'pricing', label: 'nav.pricing', path: '/pricing' },
  { key: 'contact', label: 'nav.contact', path: '/contact' },
];

export const Navigation = ({ user, isAdmin }: NavigationProps) => {
  const { t, language, setLanguage } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [navPages, setNavPages] = useState<NavPage[]>([]);
  const [siteName, setSiteName] = useState('Star Gym');
  const [siteNameColor, setSiteNameColor] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoSize, setLogoSize] = useState(32);
  const navigate = useNavigate();

  useEffect(() => {
    loadNavigationPages();
    loadSiteSettings();
  }, []);

  const loadSiteSettings = async () => {
    const { data, error } = await supabase
      .from('site_settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['site_name', 'site_name_color', 'logo_url', 'logo_size']);

    if (error) {
      console.error('Error loading site settings:', error);
      return;
    }

    data?.forEach(setting => {
      if (setting.setting_key === 'site_name' && setting.setting_value) {
        setSiteName(setting.setting_value);
      }
      if (setting.setting_key === 'site_name_color' && setting.setting_value) {
        setSiteNameColor(setting.setting_value);
      }
      if (setting.setting_key === 'logo_url' && setting.setting_value) {
        setLogoUrl(setting.setting_value);
      }
      if (setting.setting_key === 'logo_size' && setting.setting_value) {
        setLogoSize(parseInt(setting.setting_value) || 32);
      }
    });
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
      .in('setting_key', ['nav_order', 'nav_labels', 'nav_visibility']);

    let navOrder: string[] = [];
    let navLabels: Record<string, string> = {};
    let navVisibility: Record<string, boolean> = {};

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
            path: `/page/${key}`
          });
        }
      });
    }

    setNavPages(items);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            {logoUrl ? (
              <img 
                src={logoUrl} 
                alt={siteName} 
                style={{ height: `${logoSize}px` }}
                className="w-auto object-contain" 
              />
            ) : (
              <Dumbbell 
                style={{ height: `${logoSize}px`, width: `${logoSize}px` }}
                className="text-primary" 
              />
            )}
            <span 
              className="text-xl font-bold"
              style={siteNameColor ? { color: siteNameColor } : undefined}
            >
              {siteName}
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navPages.map((page) => (
              <Link 
                key={page.key}
                to={page.path} 
                className="hover:text-primary transition-colors"
              >
                {t(page.label)}
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
                {t(page.label)}
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