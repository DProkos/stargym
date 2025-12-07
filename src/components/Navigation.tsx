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
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadNavigationPages();
    loadSiteSettings();
  }, []);

  const loadSiteSettings = async () => {
    const { data, error } = await supabase
      .from('site_settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['site_name', 'logo_url']);

    if (error) {
      console.error('Error loading site settings:', error);
      return;
    }

    data?.forEach(setting => {
      if (setting.setting_key === 'site_name' && setting.setting_value) {
        setSiteName(setting.setting_value);
      }
      if (setting.setting_key === 'logo_url' && setting.setting_value) {
        setLogoUrl(setting.setting_value);
      }
    });
  };

  const loadNavigationPages = async () => {
    // Get all unique page keys that have sections in the database
    const { data, error } = await supabase
      .from('page_sections')
      .select('page_key')
      .eq('is_visible', true);

    if (error) {
      console.error('Error loading nav pages:', error);
      // Fallback to defaults if error
      setNavPages(DEFAULT_NAV_PAGES);
      return;
    }

    const existingPageKeys = [...new Set(data?.map(d => d.page_key) || [])];
    
    // Filter default nav pages to only include those that exist in DB
    const filteredPages = DEFAULT_NAV_PAGES.filter(
      page => existingPageKeys.includes(page.key)
    );

    // Always include home if it doesn't exist (as it's the main page)
    if (!filteredPages.find(p => p.key === 'home')) {
      filteredPages.unshift(DEFAULT_NAV_PAGES[0]);
    }

    setNavPages(filteredPages);
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
              <img src={logoUrl} alt={siteName} className="h-8 w-auto object-contain" />
            ) : (
              <Dumbbell className="h-8 w-8 text-primary" />
            )}
            <span className="text-xl font-bold">{siteName}</span>
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