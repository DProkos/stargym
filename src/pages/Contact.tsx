import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { MapPin, Phone, Clock, Facebook, Instagram, Twitter } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';
import { ChatbotWidget } from '@/components/ChatbotWidget';
import { useRecaptcha } from '@/hooks/useRecaptcha';

const contactSchema = z.object({
  name: z.string()
    .trim()
    .min(2, { message: 'Name must be at least 2 characters' })
    .max(100, { message: 'Name must be less than 100 characters' }),
  email: z.string()
    .trim()
    .email({ message: 'Invalid email address' })
    .max(255, { message: 'Email must be less than 255 characters' }),
  phone: z.string()
    .trim()
    .max(20, { message: 'Phone must be less than 20 characters' })
    .optional()
    .or(z.literal('')),
  message: z.string()
    .trim()
    .min(10, { message: 'Message must be at least 10 characters' })
    .max(1000, { message: 'Message must be less than 1000 characters' }),
});

interface SiteSettings {
  contact_email?: string;
  contact_phone?: string;
  contact_address?: string;
  working_hours?: string;
  facebook_url?: string;
  instagram_url?: string;
  twitter_url?: string;
}

export default function Contact() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>({});
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const { executeRecaptcha, verifyRecaptcha } = useRecaptcha();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);

      if (session?.user) {
        const { data } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .eq('role', 'admin')
          .single();
        setIsAdmin(!!data);
      }
    };

    const fetchSiteSettings = async () => {
      const { data } = await supabase
        .from('site_settings')
        .select('setting_key, setting_value')
        .in('setting_key', [
          'contact_email',
          'contact_phone',
          'contact_address',
          'working_hours',
          'facebook_url',
          'instagram_url',
          'twitter_url'
        ]);

      if (data) {
        const settings: SiteSettings = {};
        data.forEach((item) => {
          settings[item.setting_key as keyof SiteSettings] = item.setting_value || '';
        });
        setSiteSettings(settings);
      }
    };

    checkUser();
    fetchSiteSettings();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Execute reCAPTCHA
      const recaptchaToken = await executeRecaptcha('contact');
      
      if (recaptchaToken) {
        const isValid = await verifyRecaptcha(recaptchaToken);
        if (!isValid) {
          toast({
            title: 'Verification Failed',
            description: 'Please try again',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }
      }

      // Validate input data
      const validatedData = contactSchema.parse(formData);

      // Send contact form via edge function
      const { error } = await supabase.functions.invoke('send-contact-form', {
        body: {
          name: validatedData.name,
          email: validatedData.email,
          phone: validatedData.phone || '',
          message: validatedData.message,
          language: t('lang') === 'el' ? 'el' : 'en',
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to send message');
      }

      toast({ 
        title: t('contact.success') || 'Message sent successfully!',
        description: t('contact.successDesc') || 'We will get back to you soon.',
      });
      setFormData({ name: '', email: '', phone: '', message: '' });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: 'Validation Error',
          description: error.errors[0].message,
          variant: 'destructive',
        });
      } else {
        console.error('Contact form error:', error);
        toast({
          title: 'Error',
          description: error.message || 'Failed to send message. Please try again.',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Helper to ensure URLs have https:// prefix
  const ensureHttps = (url: string | undefined) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `https://${url}`;
  };

  const hasSocialLinks = siteSettings.facebook_url || siteSettings.instagram_url || siteSettings.twitter_url;

  const getGoogleMapsEmbedUrl = (address: string) => {
    const encodedAddress = encodeURIComponent(address);
    return `https://www.google.com/maps?q=${encodedAddress}&output=embed`;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation user={user} isAdmin={isAdmin} />
      <ChatbotWidget />
      
      <main className="flex-grow">
        <section className="pt-32 pb-20 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-16">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {t('contact.title')}
              </h1>
              <p className="text-xl text-muted-foreground">{t('contact.subtitle')}</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <Card className="bg-gradient-card border-border">
                <CardHeader>
                  <CardTitle>{t('contact.send')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">{t('contact.name')}</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        className="bg-secondary border-border"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">{t('contact.email')}</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                        className="bg-secondary border-border"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">{t('contact.phone')}</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="bg-secondary border-border"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="message">{t('contact.message')}</Label>
                      <Textarea
                        id="message"
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        required
                        rows={5}
                        className="bg-secondary border-border"
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? '...' : t('contact.send')}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <div className="space-y-6">
                {siteSettings.contact_address && (
                  <Card className="bg-gradient-card border-border">
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <MapPin className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                        <div>
                          <h3 className="font-semibold mb-2">{t('contact.location')}</h3>
                          <p className="text-muted-foreground whitespace-pre-line">
                            {siteSettings.contact_address}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {(siteSettings.contact_phone || siteSettings.contact_email) && (
                  <Card className="bg-gradient-card border-border">
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <Phone className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                        <div>
                          <h3 className="font-semibold mb-2">{t('contact.phone')}</h3>
                          {siteSettings.contact_phone && (
                            <p className="text-muted-foreground">
                              <a href={`tel:${siteSettings.contact_phone}`} className="hover:text-primary transition-colors">
                                {siteSettings.contact_phone}
                              </a>
                            </p>
                          )}
                          {siteSettings.contact_email && (
                            <p className="text-muted-foreground">
                              <a href={`mailto:${siteSettings.contact_email}`} className="hover:text-primary transition-colors">
                                {siteSettings.contact_email}
                              </a>
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {siteSettings.working_hours && (
                  <Card className="bg-gradient-card border-border">
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <Clock className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                        <div>
                          <h3 className="font-semibold mb-2">{t('contact.hours')}</h3>
                          <p className="text-muted-foreground whitespace-pre-line">
                            {siteSettings.working_hours}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {hasSocialLinks && (
                  <Card className="bg-gradient-card border-border">
                    <CardContent className="pt-6">
                      <h3 className="font-semibold mb-4">Social Media</h3>
                      <div className="flex gap-4">
                        {siteSettings.facebook_url && (
                          <a
                            href={ensureHttps(siteSettings.facebook_url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            referrerPolicy="no-referrer"
                            onClick={(e) => {
                              e.preventDefault();
                              window.open(ensureHttps(siteSettings.facebook_url), '_blank', 'noopener,noreferrer');
                            }}
                            className="p-3 bg-secondary rounded-full hover:bg-primary hover:text-primary-foreground transition-colors"
                            aria-label="Facebook"
                          >
                            <Facebook className="h-5 w-5" />
                          </a>
                        )}
                        {siteSettings.instagram_url && (
                          <a
                            href={ensureHttps(siteSettings.instagram_url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            referrerPolicy="no-referrer"
                            onClick={(e) => {
                              e.preventDefault();
                              window.open(ensureHttps(siteSettings.instagram_url), '_blank', 'noopener,noreferrer');
                            }}
                            className="p-3 bg-secondary rounded-full hover:bg-primary hover:text-primary-foreground transition-colors"
                            aria-label="Instagram"
                          >
                            <Instagram className="h-5 w-5" />
                          </a>
                        )}
                        {siteSettings.twitter_url && (
                          <a
                            href={ensureHttps(siteSettings.twitter_url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            referrerPolicy="no-referrer"
                            onClick={(e) => {
                              e.preventDefault();
                              window.open(ensureHttps(siteSettings.twitter_url), '_blank', 'noopener,noreferrer');
                            }}
                            className="p-3 bg-secondary rounded-full hover:bg-primary hover:text-primary-foreground transition-colors"
                            aria-label="Twitter"
                          >
                            <Twitter className="h-5 w-5" />
                          </a>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Fallback if no settings configured */}
                {!siteSettings.contact_address && !siteSettings.contact_phone && !siteSettings.contact_email && !siteSettings.working_hours && (
                  <>
                    <Card className="bg-gradient-card border-border">
                      <CardContent className="pt-6">
                        <div className="flex items-start gap-4">
                          <MapPin className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                          <div>
                            <h3 className="font-semibold mb-2">{t('contact.location')}</h3>
                            <p className="text-muted-foreground">
                              Ρυθμίστε τη διεύθυνση στο Page Builder → Site Settings → Επικοινωνία
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>
            </div>

            {/* Google Maps Section */}
            {siteSettings.contact_address && (
              <div className="mt-12">
                <Card className="bg-gradient-card border-border overflow-hidden">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-primary" />
                      {t('contact.location')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <iframe
                      src={getGoogleMapsEmbedUrl(siteSettings.contact_address)}
                      width="100%"
                      height="400"
                      style={{ border: 0 }}
                      allowFullScreen
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      title="Location Map"
                      className="w-full"
                    />
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}