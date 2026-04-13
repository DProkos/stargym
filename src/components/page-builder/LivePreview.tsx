import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { X, ExternalLink, Check, Edit2, Save, Eye, EyeOff, CheckCircle } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import GymGallery3D from '@/components/GymGallery3D';

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

interface SiteSetting {
  setting_key: string;
  setting_value: string | null;
}

interface LivePreviewProps {
  pageKey: string;
  sections: PageSection[];
  siteSettings: SiteSetting[];
  onClose: () => void;
  onUpdateSection: (sectionId: string, updates: Partial<PageSection>) => void;
}

const ICONS: Record<string, any> = {
  Dumbbell, Users, Award, Clock, Star, Heart, Zap, Target, Trophy, Flame
};

interface EditableTextProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  multiline?: boolean;
  placeholder?: string;
}

function EditableText({ value, onChange, className, multiline = false, placeholder }: EditableTextProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    onChange(localValue);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) {
      handleSave();
    }
    if (e.key === 'Escape') {
      setLocalValue(value);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <div className="relative inline-flex items-center gap-1 w-full">
        {multiline ? (
          <Textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className={cn("min-h-[60px] bg-background/90 text-foreground border-primary", className)}
            placeholder={placeholder}
          />
        ) : (
          <Input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className={cn("bg-background/90 text-foreground border-primary", className)}
            placeholder={placeholder}
          />
        )}
        <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={handleSave}>
          <Check className="h-4 w-4 text-primary" />
        </Button>
      </div>
    );
  }

  return (
    <span
      onClick={() => setIsEditing(true)}
      className={cn(
        "cursor-pointer hover:outline hover:outline-2 hover:outline-primary hover:outline-offset-2 rounded px-1 -mx-1 transition-all",
        "hover:bg-primary/10",
        className
      )}
      title="Κλικ για επεξεργασία"
    >
      {value || <span className="text-muted-foreground italic">{placeholder || 'Κλικ για προσθήκη'}</span>}
    </span>
  );
}

export function LivePreview({ pageKey, sections, siteSettings, onClose, onUpdateSection }: LivePreviewProps) {
  const [previewLang, setPreviewLang] = useState<'el' | 'en'>('el');
  const [editMode, setEditMode] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  const [packages, setPackages] = useState<any[]>([]);

  useEffect(() => {
    loadPackages();
  }, []);

  const loadPackages = async () => {
    const { data, error } = await supabase
      .from('service_packages')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true });
    
    if (!error && data) {
      setPackages(data);
    }
  };
  
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

  const getTitle = (section: PageSection) => {
    if (previewLang === 'el') {
      return section.title_el || section.title || '';
    }
    return section.title_en || section.title || '';
  };

  const getSubtitle = (section: PageSection) => {
    if (previewLang === 'el') {
      return section.subtitle_el || section.subtitle || '';
    }
    return section.subtitle_en || section.subtitle || '';
  };

  const getContent = (section: PageSection) => {
    if (previewLang === 'el') {
      return section.content_el || section.content || '';
    }
    return section.content_en || section.content || '';
  };

  const updateSectionTitle = (section: PageSection, value: string) => {
    const updates: Partial<PageSection> = previewLang === 'el' 
      ? { title_el: value, title: value }
      : { title_en: value };
    onUpdateSection(section.id, updates);
    setHasChanges(true);
  };

  const updateSectionSubtitle = (section: PageSection, value: string) => {
    const updates: Partial<PageSection> = previewLang === 'el'
      ? { subtitle_el: value, subtitle: value }
      : { subtitle_en: value };
    onUpdateSection(section.id, updates);
    setHasChanges(true);
  };

  const updateSectionContent = (section: PageSection, value: string) => {
    const updates: Partial<PageSection> = previewLang === 'el'
      ? { content_el: value, content: value }
      : { content_en: value };
    onUpdateSection(section.id, updates);
    setHasChanges(true);
  };

  const getFeatureTitle = (feature: any) => {
    if (previewLang === 'el') {
      return feature.title_el || feature.title || '';
    }
    return feature.title_en || feature.title || '';
  };

  const getFeatureDescription = (feature: any) => {
    if (previewLang === 'el') {
      return feature.description_el || feature.description || '';
    }
    return feature.description_en || feature.description || '';
  };

  const updateFeature = (section: PageSection, featureIndex: number, field: 'title' | 'description', value: string) => {
    const features = [...(section.settings?.features || [])];
    if (previewLang === 'el') {
      features[featureIndex][`${field}_el`] = value;
      features[featureIndex][field] = value;
    } else {
      features[featureIndex][`${field}_en`] = value;
    }
    onUpdateSection(section.id, { settings: { ...section.settings, features } });
    setHasChanges(true);
  };

  const renderSection = (section: PageSection) => {
    if (!section.is_visible) return null;

    const bgClass = getBackgroundClass(section.background_color);

    switch (section.section_type) {
      case 'hero':
        return (
          <section key={section.id} className={`py-20 px-4 relative overflow-hidden ${bgClass} group`}>
            {section.settings?.media_type === 'video' && section.settings?.video_url ? (
              <div className="absolute inset-0">
                <video
                  className="w-full h-full object-cover"
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="auto"
                >
                  <source src={section.settings.video_url} type={
                    section.settings.video_url.endsWith('.mov') ? 'video/quicktime' :
                    section.settings.video_url.endsWith('.webm') ? 'video/webm' : 'video/mp4'
                  } />
                </video>
                <div className="absolute inset-0 bg-black/40" />
              </div>
            ) : section.image_url ? (
              <div className="absolute inset-0 opacity-20">
                <img src={section.image_url} alt="" className="w-full h-full object-cover" />
              </div>
            ) : null}
            <div className="container mx-auto relative z-10 text-center">
              {editMode ? (
                <>
                  <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    <EditableText
                      value={getTitle(section)}
                      onChange={(v) => updateSectionTitle(section, v)}
                      placeholder="Hero title..."
                    />
                  </h1>
                  <div className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                    <EditableText
                      value={getSubtitle(section)}
                      onChange={(v) => updateSectionSubtitle(section, v)}
                      multiline
                      placeholder="Hero subtitle..."
                    />
                  </div>
                </>
              ) : (
                <>
                  <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    {getTitle(section)}
                  </h1>
                  <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                    {getSubtitle(section)}
                  </p>
                </>
              )}
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
              {editMode ? (
                <>
                  <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    <EditableText
                      value={getTitle(section)}
                      onChange={(v) => updateSectionTitle(section, v)}
                      placeholder="Header title..."
                    />
                  </h1>
                  <div className="text-xl text-muted-foreground">
                    <EditableText
                      value={getSubtitle(section)}
                      onChange={(v) => updateSectionSubtitle(section, v)}
                      placeholder="Header subtitle..."
                    />
                  </div>
                </>
              ) : (
                <>
                  <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    {getTitle(section)}
                  </h1>
                  {getSubtitle(section) && (
                    <p className="text-xl text-muted-foreground">{getSubtitle(section)}</p>
                  )}
                </>
              )}
            </div>
          </section>
        );

      case 'features':
        const features = section.settings?.features || [];
        return (
          <section key={section.id} className={`py-20 px-4 ${bgClass}`}>
            <div className="container mx-auto">
              {(getTitle(section) || getSubtitle(section) || editMode) && (
                <div className="text-center mb-16">
                  {editMode ? (
                    <>
                      <h2 className="text-4xl font-bold mb-4">
                        <EditableText
                          value={getTitle(section)}
                          onChange={(v) => updateSectionTitle(section, v)}
                          placeholder="Features title..."
                        />
                      </h2>
                      <div className="text-xl text-muted-foreground">
                        <EditableText
                          value={getSubtitle(section)}
                          onChange={(v) => updateSectionSubtitle(section, v)}
                          placeholder="Features subtitle..."
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      {getTitle(section) && <h2 className="text-4xl font-bold mb-4">{getTitle(section)}</h2>}
                      {getSubtitle(section) && <p className="text-xl text-muted-foreground">{getSubtitle(section)}</p>}
                    </>
                  )}
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
                      {editMode ? (
                        <>
                          <h3 className="text-xl font-semibold mb-2">
                            <EditableText
                              value={getFeatureTitle(feature)}
                              onChange={(v) => updateFeature(section, index, 'title', v)}
                              placeholder="Feature title..."
                            />
                          </h3>
                          <div className="text-muted-foreground">
                            <EditableText
                              value={getFeatureDescription(feature)}
                              onChange={(v) => updateFeature(section, index, 'description', v)}
                              multiline
                              placeholder="Feature description..."
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          <h3 className="text-xl font-semibold mb-2">{getFeatureTitle(feature)}</h3>
                          <p className="text-muted-foreground">{getFeatureDescription(feature)}</p>
                        </>
                      )}
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
              {editMode ? (
                <>
                  <h2 className="text-4xl font-bold mb-6">
                    <EditableText
                      value={getTitle(section)}
                      onChange={(v) => updateSectionTitle(section, v)}
                      placeholder="CTA title..."
                    />
                  </h2>
                  <div className="text-xl text-muted-foreground mb-8">
                    <EditableText
                      value={getSubtitle(section)}
                      onChange={(v) => updateSectionSubtitle(section, v)}
                      placeholder="CTA subtitle..."
                    />
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-4xl font-bold mb-6">{getTitle(section)}</h2>
                  {getSubtitle(section) && (
                    <p className="text-xl text-muted-foreground mb-8">{getSubtitle(section)}</p>
                  )}
                </>
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
              {editMode ? (
                <>
                  <h2 className="text-3xl font-bold mb-6">
                    <EditableText
                      value={getTitle(section)}
                      onChange={(v) => updateSectionTitle(section, v)}
                      placeholder="Section title..."
                    />
                  </h2>
                  <div className="prose prose-lg dark:prose-invert">
                    <EditableText
                      value={getContent(section)}
                      onChange={(v) => updateSectionContent(section, v)}
                      multiline
                      placeholder="Text content..."
                      className="text-muted-foreground"
                    />
                  </div>
                </>
              ) : (
                <>
                  {getTitle(section) && <h2 className="text-3xl font-bold mb-6">{getTitle(section)}</h2>}
                  {getContent(section) && (
                    <div className="prose prose-lg dark:prose-invert">
                      <p className="text-muted-foreground whitespace-pre-wrap">{getContent(section)}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>
        );

      case 'image':
        return (
          <section key={section.id} className={`py-16 px-4 ${bgClass}`}>
            <div className="container mx-auto max-w-4xl">
              {editMode ? (
                <h2 className="text-3xl font-bold mb-6 text-center">
                  <EditableText
                    value={getTitle(section)}
                    onChange={(v) => updateSectionTitle(section, v)}
                    placeholder="Image title..."
                  />
                </h2>
              ) : (
                getTitle(section) && <h2 className="text-3xl font-bold mb-6 text-center">{getTitle(section)}</h2>
              )}
              {section.image_url && (
                <img 
                  src={section.image_url} 
                  alt={getTitle(section) || ''} 
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
                    <h3 className="font-semibold mb-2">
                      {previewLang === 'el' ? 'Διεύθυνση' : 'Address'}
                    </h3>
                    <p className="text-muted-foreground">{getSetting('contact_address')}</p>
                  </div>
                </div>
                <div className="bg-gradient-card p-6 rounded-lg border border-border flex items-start gap-4">
                  <Phone className="h-6 w-6 text-primary flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold mb-2">
                      {previewLang === 'el' ? 'Επικοινωνία' : 'Contact'}
                    </h3>
                    <p className="text-muted-foreground">{getSetting('contact_phone')}</p>
                    <p className="text-muted-foreground">{getSetting('contact_email')}</p>
                  </div>
                </div>
                <div className="bg-gradient-card p-6 rounded-lg border border-border flex items-start gap-4">
                  <Clock className="h-6 w-6 text-primary flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold mb-2">
                      {previewLang === 'el' ? 'Ωράριο' : 'Working Hours'}
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
        return (
          <section key={section.id} className={`py-8 px-4 ${bgClass}`}>
            <div className="container mx-auto">
              <div className="bg-gradient-card p-6 rounded-lg border border-border">
                {editMode ? (
                  <h3 className="text-xl font-semibold mb-4">
                    <EditableText
                      value={getTitle(section)}
                      onChange={(v) => updateSectionTitle(section, v)}
                      placeholder="Form title..."
                    />
                  </h3>
                ) : (
                  getTitle(section) && <h3 className="text-xl font-semibold mb-4">{getTitle(section)}</h3>
                )}
                <div className="space-y-4">
                  <div className="h-10 bg-secondary rounded animate-pulse" />
                  <div className="h-10 bg-secondary rounded animate-pulse" />
                  <div className="h-24 bg-secondary rounded animate-pulse" />
                  <div className="h-10 bg-primary/20 rounded animate-pulse w-32" />
                </div>
                <p className="text-xs text-muted-foreground mt-4">
                  {previewLang === 'el' 
                    ? '(Preview - Η φόρμα θα είναι λειτουργική στο site)' 
                    : '(Preview - Form will be functional on the site)'}
                </p>
              </div>
            </div>
          </section>
        );

      case 'packages':
        return (
          <section key={section.id} className={`py-20 px-4 ${bgClass}`}>
            <div className="container mx-auto">
              <div className="text-center mb-12">
                {editMode ? (
                  <>
                    <h2 className="text-4xl font-bold mb-4">
                      <EditableText
                        value={getTitle(section)}
                        onChange={(v) => updateSectionTitle(section, v)}
                        placeholder="Packages title..."
                      />
                    </h2>
                    <div className="text-xl text-muted-foreground">
                      <EditableText
                        value={getSubtitle(section)}
                        onChange={(v) => updateSectionSubtitle(section, v)}
                        placeholder="Packages subtitle..."
                      />
                    </div>
                  </>
                ) : (
                  <>
                    {getTitle(section) && <h2 className="text-4xl font-bold mb-4">{getTitle(section)}</h2>}
                    {getSubtitle(section) && <p className="text-xl text-muted-foreground">{getSubtitle(section)}</p>}
                  </>
                )}
              </div>
              
              {packages.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
                  {packages.map((pkg, index) => (
                    <div
                      key={pkg.id}
                      className={cn(
                        "bg-gradient-card p-8 rounded-lg border border-border hover:border-primary transition-all duration-300 hover:shadow-neon relative",
                        index === 1 && packages.length > 1 && "border-primary shadow-neon scale-105"
                      )}
                    >
                      {index === 1 && packages.length > 1 && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-medium">
                          {previewLang === 'el' ? 'Δημοφιλές' : 'Popular'}
                        </div>
                      )}
                      <h3 className="text-2xl font-bold mb-2">{pkg.name}</h3>
                      <div className="mb-4">
                        <span className="text-4xl font-bold text-primary">€{pkg.price}</span>
                        {pkg.duration_months && (
                          <span className="text-muted-foreground">
                            /{pkg.duration_months} {previewLang === 'el' ? 'μήνα' : 'month'}
                          </span>
                        )}
                      </div>
                      {pkg.description && (
                        <p className="text-muted-foreground mb-4">{pkg.description}</p>
                      )}
                      {pkg.features && Array.isArray(pkg.features) && pkg.features.length > 0 && (
                        <ul className="space-y-2 mb-6">
                          {(pkg.features as string[]).map((feature: string, fIndex: number) => (
                            <li key={fIndex} className="flex items-center gap-2 text-sm">
                              <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      {pkg.sessions_included > 0 && (
                        <p className="text-sm text-muted-foreground mb-4">
                          {pkg.sessions_included} {previewLang === 'el' ? 'συνεδρίες' : 'sessions'}
                        </p>
                      )}
                      <Button className="w-full" variant={index === 1 ? "default" : "outline"}>
                        {previewLang === 'el' ? 'Επιλογή' : 'Select'}
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-12">
                  <p>
                    {previewLang === 'el' 
                      ? 'Δεν υπάρχουν διαθέσιμα πακέτα. Προσθέστε πακέτα από τη σελίδα Πακέτα.'
                      : 'No packages available. Add packages from the Packages page.'}
                  </p>
                </div>
              )}
            </div>
          </section>
        );

      case 'gallery':
        const galleryImages = section.settings?.images || [];
        const validGalleryImages = galleryImages.filter((img: { src: string; alt: string }) => img.src);
        return (
          <div key={section.id}>
            {editMode ? (
              <section className={`py-16 px-4 ${bgClass}`}>
                <div className="container mx-auto text-center">
                  <h2 className="text-3xl font-bold mb-4">
                    <EditableText
                      value={getTitle(section)}
                      onChange={(v) => updateSectionTitle(section, v)}
                      placeholder="Gallery title..."
                    />
                  </h2>
                  <div className="text-xl text-muted-foreground mb-8">
                    <EditableText
                      value={getSubtitle(section)}
                      onChange={(v) => updateSectionSubtitle(section, v)}
                      placeholder="Gallery subtitle..."
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {previewLang === 'el' 
                      ? '(Επεξεργαστείτε τις φωτογραφίες από τον πίνακα αριστερά)' 
                      : '(Edit photos from the left panel)'}
                  </p>
                  {validGalleryImages.length > 0 && (
                    <div className="flex justify-center gap-2 mt-4 flex-wrap">
                      {validGalleryImages.slice(0, 5).map((img: { src: string; alt: string }, i: number) => (
                        <img key={i} src={img.src} alt={img.alt} className="w-16 h-12 object-cover rounded" />
                      ))}
                      {validGalleryImages.length > 5 && (
                        <span className="text-sm text-muted-foreground self-center">+{validGalleryImages.length - 5} more</span>
                      )}
                    </div>
                  )}
                </div>
              </section>
            ) : (
              <GymGallery3D 
                images={validGalleryImages}
                title={getTitle(section)}
                subtitle={getSubtitle(section)}
              />
            )}
          </div>
        );

      default:
        return (
          <section key={section.id} className={`py-16 px-4 ${bgClass}`}>
            <div className="container mx-auto">
              {editMode ? (
                <>
                  <h2 className="text-3xl font-bold mb-4">
                    <EditableText
                      value={getTitle(section)}
                      onChange={(v) => updateSectionTitle(section, v)}
                      placeholder="Section title..."
                    />
                  </h2>
                  <div className="text-muted-foreground">
                    <EditableText
                      value={getContent(section)}
                      onChange={(v) => updateSectionContent(section, v)}
                      multiline
                      placeholder="Section content..."
                    />
                  </div>
                </>
              ) : (
                <>
                  {getTitle(section) && <h2 className="text-3xl font-bold mb-4">{getTitle(section)}</h2>}
                  {getContent(section) && <p className="text-muted-foreground">{getContent(section)}</p>}
                </>
              )}
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
            <h2 className="font-semibold flex items-center gap-2">
              Live Editor: {pageKey}
              {hasChanges && <span className="text-xs text-primary">(αλλαγές αποθηκεύτηκαν)</span>}
            </h2>
            <p className="text-sm text-muted-foreground">
              {editMode ? 'Κάντε κλικ σε κείμενο για επεξεργασία' : 'Προεπισκόπηση μόνο'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Edit Mode Toggle */}
          <Button
            variant={editMode ? "default" : "outline"}
            size="sm"
            onClick={() => setEditMode(!editMode)}
          >
            {editMode ? (
              <>
                <Edit2 className="h-4 w-4 mr-2" />
                Edit Mode
              </>
            ) : (
              <>
                <Eye className="h-4 w-4 mr-2" />
                View Only
              </>
            )}
          </Button>
          {/* Language Toggle */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setPreviewLang('el')}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                previewLang === 'el' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-background hover:bg-muted'
              }`}
            >
              🇬🇷 EL
            </button>
            <button
              onClick={() => setPreviewLang('en')}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                previewLang === 'en' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-background hover:bg-muted'
              }`}
            >
              🇬🇧 EN
            </button>
          </div>
          <Button variant="outline" asChild>
            <Link to={`/${pageKey === 'home' ? '' : pageKey}`} target="_blank">
              <ExternalLink className="h-4 w-4 mr-2" />
              {previewLang === 'el' ? 'Άνοιγμα' : 'Open'}
            </Link>
          </Button>
        </div>
      </div>

      {/* Edit Mode Banner */}
      {editMode && (
        <div className="bg-primary/10 border-b border-primary/20 px-4 py-2 text-center text-sm">
          <Edit2 className="h-4 w-4 inline mr-2" />
          <span className="text-primary font-medium">Live Edit Mode:</span>
          <span className="text-muted-foreground ml-2">
            Κάντε κλικ σε οποιοδήποτε κείμενο για να το επεξεργαστείτε απευθείας
          </span>
        </div>
      )}

      {/* Preview Content */}
      <div className="min-h-screen">
        {/* Mock Navigation */}
        <nav className="bg-background/80 backdrop-blur-lg border-b border-border py-4 px-4">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getSetting('logo_url') ? (
                <img 
                  src={getSetting('logo_url')} 
                  alt={getSetting('site_name') || 'Logo'}
                  style={{ height: `${getSetting('logo_size') || 32}px` }}
                  className="w-auto object-contain"
                />
              ) : (
                <Dumbbell className="h-6 w-6 text-primary" />
              )}
              <span className="font-bold">{getSetting('site_name') || 'Star Gym'}</span>
            </div>
            <div className="flex gap-6 text-sm">
              <span className="text-muted-foreground">
                {previewLang === 'el' ? 'Αρχική' : 'Home'}
              </span>
              <span className="text-muted-foreground">
                {previewLang === 'el' ? 'Μαθήματα' : 'Classes'}
              </span>
              <span className="text-muted-foreground">
                {previewLang === 'el' ? 'Τιμές' : 'Pricing'}
              </span>
              <span className="text-muted-foreground">
                {previewLang === 'el' ? 'Επικοινωνία' : 'Contact'}
              </span>
            </div>
          </div>
        </nav>

        {/* Sections */}
        <div className="pt-8">
          {visibleSections.map(renderSection)}
        </div>

        {visibleSections.length === 0 && (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            {previewLang === 'el' ? 'Δεν υπάρχουν ορατά sections' : 'No visible sections'}
          </div>
        )}
      </div>
    </div>
  );
}
