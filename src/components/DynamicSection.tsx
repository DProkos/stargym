import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
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
  is_visible: boolean;
}

interface DynamicSectionProps {
  section: PageSection;
  getSetting: (key: string) => string;
}

const ICONS: Record<string, any> = {
  Dumbbell, Users, Award, Clock, Star, Heart, Zap, Target, Trophy, Flame
};

export function DynamicSection({ section, getSetting }: DynamicSectionProps) {
  const { language } = useLanguage();

  const getTitle = () => {
    if (language === 'el') {
      return section.title_el || section.title || '';
    }
    return section.title_en || section.title || '';
  };

  const getSubtitle = () => {
    if (language === 'el') {
      return section.subtitle_el || section.subtitle || '';
    }
    return section.subtitle_en || section.subtitle || '';
  };

  const getContent = () => {
    if (language === 'el') {
      return section.content_el || section.content || '';
    }
    return section.content_en || section.content || '';
  };

  const getFeatureTitle = (feature: any) => {
    if (language === 'el') {
      return feature.title_el || feature.title || '';
    }
    return feature.title_en || feature.title || '';
  };

  const getFeatureDescription = (feature: any) => {
    if (language === 'el') {
      return feature.description_el || feature.description || '';
    }
    return feature.description_en || feature.description || '';
  };

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

  if (!section.is_visible) return null;

  const bgClass = getBackgroundClass(section.background_color);
  const title = getTitle();
  const subtitle = getSubtitle();
  const content = getContent();

  switch (section.section_type) {
    case 'hero':
      return (
        <section className={`pt-32 pb-20 px-4 relative overflow-hidden ${bgClass}`}>
          {section.image_url && (
            <div className="absolute inset-0 opacity-20">
              <img src={section.image_url} alt="" className="w-full h-full object-cover" />
            </div>
          )}
          <div className="container mx-auto relative z-10 text-center">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {title}
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              {subtitle}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {section.settings?.button_text && (
                <Button size="lg" className="shadow-neon-strong" asChild>
                  <Link to={section.settings.button_link || '/auth'}>
                    {section.settings.button_text}
                  </Link>
                </Button>
              )}
              {section.settings?.button_text_2 && (
                <Button size="lg" variant="secondary" asChild>
                  <Link to={section.settings.button_link_2 || '/classes'}>
                    {section.settings.button_text_2}
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </section>
      );

    case 'header':
      return (
        <section className={`pt-32 pb-16 px-4 ${bgClass}`}>
          <div className="container mx-auto text-center">
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xl text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </section>
      );

    case 'features':
      const features = section.settings?.features || [];
      return (
        <section className={`py-20 px-4 ${bgClass}`}>
          <div className="container mx-auto">
            {(title || subtitle) && (
              <div className="text-center mb-16">
                {title && <h2 className="text-4xl font-bold mb-4">{title}</h2>}
                {subtitle && <p className="text-xl text-muted-foreground">{subtitle}</p>}
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
                    <h3 className="text-xl font-semibold mb-2">{getFeatureTitle(feature)}</h3>
                    <p className="text-muted-foreground">{getFeatureDescription(feature)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      );

    case 'cta':
      return (
        <section className={`py-20 px-4 ${bgClass}`}>
          <div className="container mx-auto text-center">
            <h2 className="text-4xl font-bold mb-6">{title}</h2>
            {subtitle && (
              <p className="text-xl text-muted-foreground mb-8">{subtitle}</p>
            )}
            {section.settings?.button_text && (
              <Button size="lg" className="shadow-neon-strong" asChild>
                <Link to={section.settings.button_link || '/auth'}>
                  {section.settings.button_text}
                </Link>
              </Button>
            )}
          </div>
        </section>
      );

    case 'text':
      return (
        <section className={`py-16 px-4 ${bgClass}`}>
          <div className="container mx-auto max-w-3xl">
            {title && <h2 className="text-3xl font-bold mb-6">{title}</h2>}
            {content && (
              <div className="prose prose-lg dark:prose-invert">
                <p className="text-muted-foreground whitespace-pre-wrap">{content}</p>
              </div>
            )}
          </div>
        </section>
      );

    case 'image':
      return (
        <section className={`py-16 px-4 ${bgClass}`}>
          <div className="container mx-auto max-w-4xl">
            {title && <h2 className="text-3xl font-bold mb-6 text-center">{title}</h2>}
            {section.image_url && (
              <img 
                src={section.image_url} 
                alt={title || ''} 
                className="w-full rounded-lg shadow-lg"
              />
            )}
          </div>
        </section>
      );

    case 'contact_info':
      return (
        <section className={`py-8 px-4 ${bgClass}`}>
          <div className="container mx-auto max-w-xl">
            <div className="space-y-4">
              <div className="bg-gradient-card p-6 rounded-lg border border-border flex items-start gap-4">
                <MapPin className="h-6 w-6 text-primary flex-shrink-0" />
                <div>
                  <h3 className="font-semibold mb-2">
                    {language === 'el' ? 'Διεύθυνση' : 'Address'}
                  </h3>
                  <p className="text-muted-foreground">{getSetting('contact_address')}</p>
                </div>
              </div>
              <div className="bg-gradient-card p-6 rounded-lg border border-border flex items-start gap-4">
                <Phone className="h-6 w-6 text-primary flex-shrink-0" />
                <div>
                  <h3 className="font-semibold mb-2">
                    {language === 'el' ? 'Επικοινωνία' : 'Contact'}
                  </h3>
                  <p className="text-muted-foreground">{getSetting('contact_phone')}</p>
                  <p className="text-muted-foreground">{getSetting('contact_email')}</p>
                </div>
              </div>
              <div className="bg-gradient-card p-6 rounded-lg border border-border flex items-start gap-4">
                <Clock className="h-6 w-6 text-primary flex-shrink-0" />
                <div>
                  <h3 className="font-semibold mb-2">
                    {language === 'el' ? 'Ωράριο' : 'Working Hours'}
                  </h3>
                  <p className="text-muted-foreground">{getSetting('working_hours_weekday')}</p>
                  <p className="text-muted-foreground">{getSetting('working_hours_weekend')}</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      );

    case 'contact_form':
      // This will be handled by the Contact page itself
      return null;

    default:
      return (
        <section className={`py-16 px-4 ${bgClass}`}>
          <div className="container mx-auto">
            {title && <h2 className="text-3xl font-bold mb-4">{title}</h2>}
            {content && <p className="text-muted-foreground">{content}</p>}
          </div>
        </section>
      );
  }
}

interface DynamicPageSectionsProps {
  sections: PageSection[];
  getSetting: (key: string) => string;
}

export function DynamicPageSections({ sections, getSetting }: DynamicPageSectionsProps) {
  return (
    <>
      {sections.map((section) => (
        <DynamicSection key={section.id} section={section} getSetting={getSetting} />
      ))}
    </>
  );
}