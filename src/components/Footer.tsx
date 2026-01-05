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
  facebook_url?: string;
  instagram_url?: string;
  twitter_url?: string;
}

export function Footer() {
  const { language } = useLanguage();
  const [settings, setSettings] = useState<SiteSettings>({});

  useEffect(() => {
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
          'facebook_url',
          'instagram_url',
          'twitter_url'
        ]);

      if (data) {
        const settingsObj: SiteSettings = {};
        data.forEach((item) => {
          settingsObj[item.setting_key as keyof SiteSettings] = item.setting_value || '';
        });
        setSettings(settingsObj);
      }
    };

    fetchSettings();
  }, []);

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

  return (
    <footer className="bg-card border-t border-border">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand / About */}
          <div>
            <h3 className="text-xl font-bold text-primary mb-4">
              {settings.site_name || 'Star Gym'}
            </h3>
            <p className="text-muted-foreground text-sm">
              {language === 'el' 
                ? 'Το γυμναστήριο που θα αλλάξει τη ζωή σου. Ελάτε να γνωριστούμε!'
                : 'The gym that will change your life. Come meet us!'}
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4">
              {language === 'el' ? 'Σύνδεσμοι' : 'Quick Links'}
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/" className="text-muted-foreground hover:text-primary transition-colors">
                  {language === 'el' ? 'Αρχική' : 'Home'}
                </Link>
              </li>
              <li>
                <Link to="/classes" className="text-muted-foreground hover:text-primary transition-colors">
                  {language === 'el' ? 'Μαθήματα' : 'Classes'}
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="text-muted-foreground hover:text-primary transition-colors">
                  {language === 'el' ? 'Τιμές' : 'Pricing'}
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-muted-foreground hover:text-primary transition-colors">
                  {language === 'el' ? 'Επικοινωνία' : 'Contact'}
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          {hasContact && (
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
                {settings.working_hours && (
                  <li className="flex items-start gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                    <span className="whitespace-pre-line">{settings.working_hours}</span>
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
