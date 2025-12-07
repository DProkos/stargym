import { Button } from '@/components/ui/button';
import { X, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { 
  Dumbbell, 
  Users, 
  Award, 
  Clock, 
  Star, 
  Heart, 
  Zap, 
  Target, 
  Trophy, 
  Flame,
  MapPin,
  Phone
} from 'lucide-react';

interface PageSection {
  id: string;
  section_type: string;
  title: string | null;
  subtitle: string | null;
  content: string | null;
  image_url: string | null;
  background_color: string;
  text_color: string;
  settings: any;
  is_visible: boolean;
}

interface SiteSetting {
  setting_key: string;
  setting_value: string | null;
}

interface PagePreviewProps {
  pageKey: string;
  sections: PageSection[];
  siteSettings: SiteSetting[];
  onClose: () => void;
}

const ICONS: Record<string, any> = {
  Dumbbell, Users, Award, Clock, Star, Heart, Zap, Target, Trophy, Flame
};

export function PagePreview({ pageKey, sections, siteSettings, onClose }: PagePreviewProps) {
  const getSetting = (key: string) => siteSettings.find(s => s.setting_key === key)?.setting_value || '';

  const getBackgroundClass = (bg: string) => {
    switch (bg) {
      case 'gradient':
        return 'bg-gradient-hero';
      case 'primary':
        return 'bg-primary/10';
      case 'secondary':
        return 'bg-secondary';
      default:
        return 'bg-background';
    }
  };

  const renderSection = (section: PageSection) => {
    if (!section.is_visible) return null;

    const bgClass = getBackgroundClass(section.background_color);

    switch (section.section_type) {
      case 'hero':
        return (
          <section key={section.id} className={`py-20 px-4 relative overflow-hidden ${bgClass}`}>
            {section.image_url && (
              <div className="absolute inset-0 opacity-20">
                <img src={section.image_url} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="container mx-auto relative z-10 text-center">
              <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {section.title}
              </h1>
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                {section.subtitle}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                {section.settings?.button_text && (
                  <Button size="lg" className="shadow-neon-strong">
                    {section.settings.button_text}
                  </Button>
                )}
                {section.settings?.button_text_2 && (
                  <Button size="lg" variant="secondary">
                    {section.settings.button_text_2}
                  </Button>
                )}
              </div>
            </div>
          </section>
        );

      case 'header':
        return (
          <section key={section.id} className={`py-16 px-4 ${bgClass}`}>
            <div className="container mx-auto text-center">
              <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {section.title}
              </h1>
              {section.subtitle && (
                <p className="text-xl text-muted-foreground">{section.subtitle}</p>
              )}
            </div>
          </section>
        );

      case 'features':
        const features = section.settings?.features || [];
        return (
          <section key={section.id} className={`py-20 px-4 ${bgClass}`}>
            <div className="container mx-auto">
              {(section.title || section.subtitle) && (
                <div className="text-center mb-16">
                  {section.title && <h2 className="text-4xl font-bold mb-4">{section.title}</h2>}
                  {section.subtitle && <p className="text-xl text-muted-foreground">{section.subtitle}</p>}
                </div>
              )}
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                {features.map((feature: any, index: number) => {
                  const Icon = ICONS[feature.icon] || Star;
                  return (
                    <div 
                      key={index} 
                      className="bg-gradient-card p-8 rounded-lg border border-border hover:border-primary transition-all duration-300 hover:shadow-neon"
                    >
                      <Icon className="h-12 w-12 text-primary mb-4" />
                      <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                      <p className="text-muted-foreground">{feature.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        );

      case 'cta':
        return (
          <section key={section.id} className={`py-20 px-4 ${bgClass}`}>
            <div className="container mx-auto text-center">
              <h2 className="text-4xl font-bold mb-6">{section.title}</h2>
              {section.subtitle && (
                <p className="text-xl text-muted-foreground mb-8">{section.subtitle}</p>
              )}
              {section.settings?.button_text && (
                <Button size="lg" className="shadow-neon-strong">
                  {section.settings.button_text}
                </Button>
              )}
            </div>
          </section>
        );

      case 'text':
        return (
          <section key={section.id} className={`py-16 px-4 ${bgClass}`}>
            <div className="container mx-auto max-w-3xl">
              {section.title && <h2 className="text-3xl font-bold mb-6">{section.title}</h2>}
              {section.content && (
                <div className="prose prose-lg dark:prose-invert">
                  <p className="text-muted-foreground whitespace-pre-wrap">{section.content}</p>
                </div>
              )}
            </div>
          </section>
        );

      case 'image':
        return (
          <section key={section.id} className={`py-16 px-4 ${bgClass}`}>
            <div className="container mx-auto max-w-4xl">
              {section.title && <h2 className="text-3xl font-bold mb-6 text-center">{section.title}</h2>}
              {section.image_url && (
                <img 
                  src={section.image_url} 
                  alt={section.title || ''} 
                  className="w-full rounded-lg shadow-lg"
                />
              )}
            </div>
          </section>
        );

      case 'contact_info':
        return (
          <section key={section.id} className={`py-8 px-4 ${bgClass}`}>
            <div className="container mx-auto">
              <div className="space-y-4">
                <div className="bg-gradient-card p-6 rounded-lg border border-border flex items-start gap-4">
                  <MapPin className="h-6 w-6 text-primary flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold mb-2">Διεύθυνση</h3>
                    <p className="text-muted-foreground">{getSetting('contact_address')}</p>
                  </div>
                </div>
                <div className="bg-gradient-card p-6 rounded-lg border border-border flex items-start gap-4">
                  <Phone className="h-6 w-6 text-primary flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold mb-2">Επικοινωνία</h3>
                    <p className="text-muted-foreground">{getSetting('contact_phone')}</p>
                    <p className="text-muted-foreground">{getSetting('contact_email')}</p>
                  </div>
                </div>
                <div className="bg-gradient-card p-6 rounded-lg border border-border flex items-start gap-4">
                  <Clock className="h-6 w-6 text-primary flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold mb-2">Ωράριο</h3>
                    <p className="text-muted-foreground">{getSetting('working_hours_weekday')}</p>
                    <p className="text-muted-foreground">{getSetting('working_hours_weekend')}</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        );

      case 'contact_form':
        return (
          <section key={section.id} className={`py-8 px-4 ${bgClass}`}>
            <div className="container mx-auto">
              <div className="bg-gradient-card p-6 rounded-lg border border-border">
                {section.title && <h3 className="text-xl font-semibold mb-4">{section.title}</h3>}
                <div className="space-y-4">
                  <div className="h-10 bg-secondary rounded animate-pulse" />
                  <div className="h-10 bg-secondary rounded animate-pulse" />
                  <div className="h-24 bg-secondary rounded animate-pulse" />
                  <div className="h-10 bg-primary/20 rounded animate-pulse w-32" />
                </div>
                <p className="text-xs text-muted-foreground mt-4">
                  (Preview - Η φόρμα θα είναι λειτουργική στο site)
                </p>
              </div>
            </div>
          </section>
        );

      default:
        return (
          <section key={section.id} className={`py-16 px-4 ${bgClass}`}>
            <div className="container mx-auto">
              {section.title && <h2 className="text-3xl font-bold mb-4">{section.title}</h2>}
              {section.content && <p className="text-muted-foreground">{section.content}</p>}
            </div>
          </section>
        );
    }
  };

  const visibleSections = sections.filter(s => s.is_visible);

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm overflow-auto">
      {/* Header */}
      <div className="sticky top-0 bg-background border-b z-10 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="font-semibold">Preview: {pageKey}</h2>
            <p className="text-sm text-muted-foreground">{visibleSections.length} sections</p>
          </div>
        </div>
        <Button variant="outline" asChild>
          <Link to={`/${pageKey === 'home' ? '' : pageKey}`} target="_blank">
            <ExternalLink className="h-4 w-4 mr-2" />
            Άνοιγμα
          </Link>
        </Button>
      </div>

      {/* Preview Content */}
      <div className="min-h-screen pt-16">
        {/* Mock Navigation */}
        <nav className="bg-background/80 backdrop-blur-lg border-b border-border py-4 px-4">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Dumbbell className="h-6 w-6 text-primary" />
              <span className="font-bold">{getSetting('site_name') || 'Star Gym'}</span>
            </div>
            <div className="flex gap-6 text-sm">
              <span className="text-muted-foreground">Αρχική</span>
              <span className="text-muted-foreground">Μαθήματα</span>
              <span className="text-muted-foreground">Τιμές</span>
              <span className="text-muted-foreground">Επικοινωνία</span>
            </div>
          </div>
        </nav>

        {/* Sections */}
        <div className="pt-8">
          {visibleSections.map(renderSection)}
        </div>

        {visibleSections.length === 0 && (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            Δεν υπάρχουν ορατά sections
          </div>
        )}
      </div>
    </div>
  );
}