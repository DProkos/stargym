import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Dumbbell, Menu, X, Globe } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface NavigationProps {
  user: any;
  isAdmin: boolean;
}

export const Navigation = ({ user, isAdmin }: NavigationProps) => {
  const { t, language, setLanguage } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'el' : 'en');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <Dumbbell className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">GymPro</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link to="/" className="hover:text-primary transition-colors">
              {t('nav.home')}
            </Link>
            <Link to="/classes" className="hover:text-primary transition-colors">
              {t('nav.classes')}
            </Link>
            <Link to="/pricing" className="hover:text-primary transition-colors">
              {t('nav.pricing')}
            </Link>
            <Link to="/contact" className="hover:text-primary transition-colors">
              {t('nav.contact')}
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={toggleLanguage}>
              <Globe className="h-5 w-5" />
            </Button>
            
            {user ? (
              <>
                {isAdmin && (
                  <Button variant="secondary" asChild>
                    <Link to="/admin">{t('nav.dashboard')}</Link>
                  </Button>
                )}
                <Button variant="secondary" asChild>
                  <Link to="/bookings">{t('nav.myBookings')}</Link>
                </Button>
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
            <Link to="/" className="hover:text-primary transition-colors" onClick={() => setMobileMenuOpen(false)}>
              {t('nav.home')}
            </Link>
            <Link to="/classes" className="hover:text-primary transition-colors" onClick={() => setMobileMenuOpen(false)}>
              {t('nav.classes')}
            </Link>
            <Link to="/pricing" className="hover:text-primary transition-colors" onClick={() => setMobileMenuOpen(false)}>
              {t('nav.pricing')}
            </Link>
            <Link to="/contact" className="hover:text-primary transition-colors" onClick={() => setMobileMenuOpen(false)}>
              {t('nav.contact')}
            </Link>
            <Button variant="ghost" size="sm" onClick={toggleLanguage} className="justify-start">
              <Globe className="h-5 w-5 mr-2" />
              {language === 'en' ? 'Ελληνικά' : 'English'}
            </Button>
            {user ? (
              <>
                {isAdmin && (
                  <Button variant="secondary" asChild onClick={() => setMobileMenuOpen(false)}>
                    <Link to="/admin">{t('nav.dashboard')}</Link>
                  </Button>
                )}
                <Button variant="secondary" asChild onClick={() => setMobileMenuOpen(false)}>
                  <Link to="/bookings">{t('nav.myBookings')}</Link>
                </Button>
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