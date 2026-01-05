import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ImageUpload from '@/components/ImageUpload';
import { Plus, Trash2, Languages, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableGalleryItem } from './SortableGalleryItem';

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
}

interface SectionEditorProps {
  section: PageSection;
  onUpdate: (updates: Partial<PageSection>) => void;
}

const BACKGROUND_OPTIONS = [
  { value: 'default', label: 'Default' },
  { value: 'gradient', label: 'Gradient' },
  { value: 'primary', label: 'Primary' },
  { value: 'secondary', label: 'Secondary' },
];

const TEXT_COLOR_OPTIONS = [
  { value: 'default', label: 'Default' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

const ICON_OPTIONS = [
  'Dumbbell', 'Users', 'Award', 'Clock', 'Star', 'Heart', 'Zap', 'Target', 'Trophy', 'Flame'
];

const FONT_SIZE_OPTIONS = [
  { value: 'small', label: 'Μικρό' },
  { value: 'medium', label: 'Μεσαίο' },
  { value: 'large', label: 'Μεγάλο' },
  { value: 'xlarge', label: 'Πολύ Μεγάλο' },
];

const IMAGE_POSITION_OPTIONS = [
  { value: 'center', label: 'Κέντρο' },
  { value: 'top', label: 'Πάνω' },
  { value: 'bottom', label: 'Κάτω' },
  { value: 'left', label: 'Αριστερά' },
  { value: 'right', label: 'Δεξιά' },
];

const IMAGE_SIZE_OPTIONS = [
  { value: 'cover', label: 'Cover (Γεμάτο)' },
  { value: 'contain', label: 'Contain (Ολόκληρη)' },
  { value: 'auto', label: 'Auto' },
];

const ANIMATION_TYPE_OPTIONS = [
  { value: 'none', label: 'Χωρίς Animation' },
  { value: 'fade-in', label: 'Fade In' },
  { value: 'fade-up', label: 'Fade Up' },
  { value: 'fade-down', label: 'Fade Down' },
  { value: 'scale-in', label: 'Scale In' },
  { value: 'slide-left', label: 'Slide Left' },
  { value: 'slide-right', label: 'Slide Right' },
];

const ANIMATION_SPEED_OPTIONS = [
  { value: 'fast', label: 'Γρήγορο (0.3s)' },
  { value: 'normal', label: 'Κανονικό (0.5s)' },
  { value: 'slow', label: 'Αργό (0.8s)' },
  { value: 'very-slow', label: 'Πολύ Αργό (1.2s)' },
];

const ANIMATION_DELAY_OPTIONS = [
  { value: '0', label: 'Χωρίς Delay' },
  { value: '100', label: '100ms' },
  { value: '200', label: '200ms' },
  { value: '300', label: '300ms' },
  { value: '500', label: '500ms' },
];

export function SectionEditor({ section, onUpdate }: SectionEditorProps) {
  const [localSettings, setLocalSettings] = useState(section.settings || {});
  const [activeLang, setActiveLang] = useState<'el' | 'en'>('el');
  const [isTranslating, setIsTranslating] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    setLocalSettings(section.settings || {});
  }, [section.id]);

  const updateSettings = (key: string, value: any) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    onUpdate({ settings: newSettings });
  };

  const handleGalleryDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const galleryImages = localSettings.images || [];
      const oldIndex = galleryImages.findIndex((_: any, i: number) => `gallery-img-${i}` === active.id);
      const newIndex = galleryImages.findIndex((_: any, i: number) => `gallery-img-${i}` === over.id);
      const newImages = arrayMove(galleryImages, oldIndex, newIndex);
      updateSettings('images', newImages);
    }
  };

  const getTitleField = () => activeLang === 'el' ? 'title_el' : 'title_en';
  const getSubtitleField = () => activeLang === 'el' ? 'subtitle_el' : 'subtitle_en';
  const getContentField = () => activeLang === 'el' ? 'content_el' : 'content_en';

  const getCurrentTitle = () => section[getTitleField()] || '';
  const getCurrentSubtitle = () => section[getSubtitleField()] || '';
  const getCurrentContent = () => section[getContentField()] || '';

  const updateTitle = (value: string) => {
    const field = getTitleField();
    onUpdate({ [field]: value, title: activeLang === 'el' ? value : section.title });
  };

  const updateSubtitle = (value: string) => {
    const field = getSubtitleField();
    onUpdate({ [field]: value, subtitle: activeLang === 'el' ? value : section.subtitle });
  };

  const updateContent = (value: string) => {
    const field = getContentField();
    onUpdate({ [field]: value, content: activeLang === 'el' ? value : section.content });
  };

  const translateText = async (text: string, targetLang: 'el' | 'en'): Promise<string> => {
    const { data, error } = await supabase.functions.invoke('translate-content', {
      body: { text, targetLanguage: targetLang }
    });
    
    if (error) throw error;
    return data.translatedText;
  };

  const handleBulkTranslate = async (direction: 'el-to-en' | 'en-to-el') => {
    setIsTranslating(true);
    const sourceLang = direction === 'el-to-en' ? 'el' : 'en';
    const targetLang = direction === 'el-to-en' ? 'en' : 'el';
    
    try {
      const updates: Partial<PageSection> = {};
      
      // Translate title
      const sourceTitle = sourceLang === 'el' ? section.title_el : section.title_en;
      if (sourceTitle) {
        const translatedTitle = await translateText(sourceTitle, targetLang);
        if (targetLang === 'el') {
          updates.title_el = translatedTitle;
          updates.title = translatedTitle;
        } else {
          updates.title_en = translatedTitle;
        }
      }
      
      // Translate subtitle
      const sourceSubtitle = sourceLang === 'el' ? section.subtitle_el : section.subtitle_en;
      if (sourceSubtitle) {
        const translatedSubtitle = await translateText(sourceSubtitle, targetLang);
        if (targetLang === 'el') {
          updates.subtitle_el = translatedSubtitle;
          updates.subtitle = translatedSubtitle;
        } else {
          updates.subtitle_en = translatedSubtitle;
        }
      }
      
      // Translate content
      const sourceContent = sourceLang === 'el' ? section.content_el : section.content_en;
      if (sourceContent) {
        const translatedContent = await translateText(sourceContent, targetLang);
        if (targetLang === 'el') {
          updates.content_el = translatedContent;
          updates.content = translatedContent;
        } else {
          updates.content_en = translatedContent;
        }
      }
      
      // Translate features if present
      const features = localSettings.features;
      if (features && features.length > 0) {
        const translatedFeatures = await Promise.all(
          features.map(async (feature: any) => {
            const sourceFeatureTitle = sourceLang === 'el' 
              ? (feature.title_el || feature.title) 
              : (feature.title_en || feature.title);
            const sourceFeatureDesc = sourceLang === 'el' 
              ? (feature.description_el || feature.description) 
              : (feature.description_en || feature.description);
            
            const translatedTitle = sourceFeatureTitle 
              ? await translateText(sourceFeatureTitle, targetLang) 
              : '';
            const translatedDesc = sourceFeatureDesc 
              ? await translateText(sourceFeatureDesc, targetLang) 
              : '';
            
            return {
              ...feature,
              [`title_${targetLang}`]: translatedTitle,
              [`description_${targetLang}`]: translatedDesc,
              ...(targetLang === 'el' ? { title: translatedTitle, description: translatedDesc } : {})
            };
          })
        );
        updates.settings = { ...localSettings, features: translatedFeatures };
        setLocalSettings(updates.settings);
      }
      
      if (Object.keys(updates).length > 0) {
        onUpdate(updates);
        toast.success(`Μεταφράστηκε επιτυχώς σε ${targetLang === 'el' ? 'Ελληνικά' : 'Αγγλικά'}`);
      } else {
        toast.info('Δεν υπάρχει περιεχόμενο για μετάφραση');
      }
    } catch (error) {
      console.error('Translation error:', error);
      toast.error('Σφάλμα κατά τη μετάφραση');
    } finally {
      setIsTranslating(false);
    }
  };

  const renderLanguageTabs = () => (
    <div className="flex items-center justify-between mb-4">
      <div className="flex gap-2">
        <Button
          variant={activeLang === 'el' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveLang('el')}
        >
          🇬🇷 Ελληνικά
        </Button>
        <Button
          variant={activeLang === 'en' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveLang('en')}
        >
          🇬🇧 English
        </Button>
      </div>
      <div className="flex gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleBulkTranslate('el-to-en')}
          disabled={isTranslating}
          title="Μετάφραση EL → EN"
        >
          {isTranslating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Languages className="h-4 w-4" />}
          <span className="ml-1 text-xs">EL→EN</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleBulkTranslate('en-to-el')}
          disabled={isTranslating}
          title="Μετάφραση EN → EL"
        >
          {isTranslating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Languages className="h-4 w-4" />}
          <span className="ml-1 text-xs">EN→EL</span>
        </Button>
      </div>
    </div>
  );

  const renderContentFields = () => {
    switch (section.section_type) {
      case 'hero':
        return (
          <div className="space-y-4">
            {renderLanguageTabs()}
            <div>
              <Label>Τίτλος ({activeLang.toUpperCase()})</Label>
              <Input
                value={getCurrentTitle()}
                onChange={(e) => updateTitle(e.target.value)}
                placeholder="Hero title..."
              />
            </div>
            <div>
              <Label>Υπότιτλος ({activeLang.toUpperCase()})</Label>
              <Textarea
                value={getCurrentSubtitle()}
                onChange={(e) => updateSubtitle(e.target.value)}
                placeholder="Hero subtitle..."
              />
            </div>
            <div>
              <Label>Hero Image</Label>
              <ImageUpload
                currentImageUrl={section.image_url}
                onImageUploaded={(url) => onUpdate({ image_url: url })}
                bucket="cms-images"
                folder="hero"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Button 1 Text</Label>
                <Input
                  value={localSettings.button_text || ''}
                  onChange={(e) => updateSettings('button_text', e.target.value)}
                  placeholder="Get Started"
                />
              </div>
              <div>
                <Label>Button 1 Link</Label>
                <Input
                  value={localSettings.button_link || ''}
                  onChange={(e) => updateSettings('button_link', e.target.value)}
                  placeholder="/auth"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Button 2 Text</Label>
                <Input
                  value={localSettings.button_text_2 || ''}
                  onChange={(e) => updateSettings('button_text_2', e.target.value)}
                  placeholder="View Classes"
                />
              </div>
              <div>
                <Label>Button 2 Link</Label>
                <Input
                  value={localSettings.button_link_2 || ''}
                  onChange={(e) => updateSettings('button_link_2', e.target.value)}
                  placeholder="/classes"
                />
              </div>
            </div>
          </div>
        );

      case 'header':
        return (
          <div className="space-y-4">
            {renderLanguageTabs()}
            <div>
              <Label>Τίτλος ({activeLang.toUpperCase()})</Label>
              <Input
                value={getCurrentTitle()}
                onChange={(e) => updateTitle(e.target.value)}
                placeholder="Page title..."
              />
            </div>
            <div>
              <Label>Υπότιτλος ({activeLang.toUpperCase()})</Label>
              <Textarea
                value={getCurrentSubtitle()}
                onChange={(e) => updateSubtitle(e.target.value)}
                placeholder="Page subtitle..."
              />
            </div>
          </div>
        );

      case 'text':
        return (
          <div className="space-y-4">
            {renderLanguageTabs()}
            <div>
              <Label>Τίτλος ({activeLang.toUpperCase()})</Label>
              <Input
                value={getCurrentTitle()}
                onChange={(e) => updateTitle(e.target.value)}
                placeholder="Section title..."
              />
            </div>
            <div>
              <Label>Περιεχόμενο ({activeLang.toUpperCase()})</Label>
              <Textarea
                value={getCurrentContent()}
                onChange={(e) => updateContent(e.target.value)}
                placeholder="Text content..."
                rows={6}
              />
            </div>
          </div>
        );

      case 'features':
        const features = localSettings.features || [];
        return (
          <div className="space-y-4">
            {renderLanguageTabs()}
            <div>
              <Label>Τίτλος ({activeLang.toUpperCase()})</Label>
              <Input
                value={getCurrentTitle()}
                onChange={(e) => updateTitle(e.target.value)}
                placeholder="Features title..."
              />
            </div>
            <div>
              <Label>Υπότιτλος ({activeLang.toUpperCase()})</Label>
              <Input
                value={getCurrentSubtitle()}
                onChange={(e) => updateSubtitle(e.target.value)}
                placeholder="Features subtitle..."
              />
            </div>
            <div>
              <Label className="flex items-center justify-between">
                Features
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    updateSettings('features', [
                      ...features,
                      { icon: 'Star', title: 'New Feature', title_en: 'New Feature', title_el: 'Νέο Χαρακτηριστικό', description: 'Feature description', description_en: 'Feature description', description_el: 'Περιγραφή χαρακτηριστικού' }
                    ]);
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" /> Προσθήκη
                </Button>
              </Label>
              <div className="space-y-3 mt-2">
                {features.map((feature: any, index: number) => (
                  <Card key={index} className="p-3">
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Select
                          value={feature.icon}
                          onValueChange={(value) => {
                            const newFeatures = [...features];
                            newFeatures[index].icon = value;
                            updateSettings('features', newFeatures);
                          }}
                        >
                          <SelectTrigger className="w-[120px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ICON_OPTIONS.map(icon => (
                              <SelectItem key={icon} value={icon}>{icon}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          value={activeLang === 'el' ? (feature.title_el || feature.title) : (feature.title_en || feature.title)}
                          onChange={(e) => {
                            const newFeatures = [...features];
                            if (activeLang === 'el') {
                              newFeatures[index].title_el = e.target.value;
                              newFeatures[index].title = e.target.value;
                            } else {
                              newFeatures[index].title_en = e.target.value;
                            }
                            updateSettings('features', newFeatures);
                          }}
                          placeholder={`Feature title (${activeLang.toUpperCase()})`}
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => {
                            updateSettings('features', features.filter((_: any, i: number) => i !== index));
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <Textarea
                        value={activeLang === 'el' ? (feature.description_el || feature.description) : (feature.description_en || feature.description)}
                        onChange={(e) => {
                          const newFeatures = [...features];
                          if (activeLang === 'el') {
                            newFeatures[index].description_el = e.target.value;
                            newFeatures[index].description = e.target.value;
                          } else {
                            newFeatures[index].description_en = e.target.value;
                          }
                          updateSettings('features', newFeatures);
                        }}
                        placeholder={`Feature description (${activeLang.toUpperCase()})`}
                        rows={2}
                      />
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        );

      case 'cta':
        return (
          <div className="space-y-4">
            {renderLanguageTabs()}
            <div>
              <Label>Τίτλος ({activeLang.toUpperCase()})</Label>
              <Input
                value={getCurrentTitle()}
                onChange={(e) => updateTitle(e.target.value)}
                placeholder="CTA title..."
              />
            </div>
            <div>
              <Label>Υπότιτλος ({activeLang.toUpperCase()})</Label>
              <Textarea
                value={getCurrentSubtitle()}
                onChange={(e) => updateSubtitle(e.target.value)}
                placeholder="CTA subtitle..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Button Text</Label>
                <Input
                  value={localSettings.button_text || ''}
                  onChange={(e) => updateSettings('button_text', e.target.value)}
                  placeholder="Start Now"
                />
              </div>
              <div>
                <Label>Button Link</Label>
                <Input
                  value={localSettings.button_link || ''}
                  onChange={(e) => updateSettings('button_link', e.target.value)}
                  placeholder="/auth"
                />
              </div>
            </div>
          </div>
        );

      case 'image':
        return (
          <div className="space-y-4">
            {renderLanguageTabs()}
            <div>
              <Label>Τίτλος ({activeLang.toUpperCase()}) (optional)</Label>
              <Input
                value={getCurrentTitle()}
                onChange={(e) => updateTitle(e.target.value)}
                placeholder="Image title..."
              />
            </div>
            <div>
              <Label>Εικόνα</Label>
              <ImageUpload
                currentImageUrl={section.image_url}
                onImageUploaded={(url) => onUpdate({ image_url: url })}
                bucket="cms-images"
                folder="sections"
              />
            </div>
          </div>
        );

      case 'gallery':
        const galleryImages = localSettings.images || [];
        const galleryItemIds = galleryImages.map((_: any, i: number) => `gallery-img-${i}`);
        return (
          <div className="space-y-4">
            {renderLanguageTabs()}
            <div>
              <Label>Τίτλος ({activeLang.toUpperCase()})</Label>
              <Input
                value={getCurrentTitle()}
                onChange={(e) => updateTitle(e.target.value)}
                placeholder="Gallery title..."
              />
            </div>
            <div>
              <Label>Υπότιτλος ({activeLang.toUpperCase()})</Label>
              <Textarea
                value={getCurrentSubtitle()}
                onChange={(e) => updateSubtitle(e.target.value)}
                placeholder="Gallery subtitle..."
              />
            </div>
            <div>
              <Label className="flex items-center justify-between">
                Φωτογραφίες Gallery
                <span className="text-xs text-muted-foreground">{galleryImages.length} εικόνες • Σύρε για αναδιάταξη</span>
              </Label>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleGalleryDragEnd}
              >
                <SortableContext items={galleryItemIds} strategy={verticalListSortingStrategy}>
                  <div className="space-y-3 mt-2">
                    {galleryImages.map((img: { src: string; alt: string }, index: number) => (
                      <SortableGalleryItem
                        key={`gallery-img-${index}`}
                        id={`gallery-img-${index}`}
                        index={index}
                        image={img}
                        onImageUpdate={(idx, field, value) => {
                          const newImages = [...galleryImages];
                          newImages[idx][field] = value;
                          updateSettings('images', newImages);
                        }}
                        onImageDelete={(idx) => {
                          updateSettings('images', galleryImages.filter((_: any, i: number) => i !== idx));
                        }}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
              <Button
                variant="outline"
                className="w-full mt-3"
                onClick={() => {
                  updateSettings('images', [
                    ...galleryImages,
                    { src: '', alt: 'Νέα εικόνα' }
                  ]);
                }}
              >
                <Plus className="h-4 w-4 mr-2" /> Προσθήκη Εικόνας
              </Button>
            </div>
          </div>
        );

      case 'contact_form':
      case 'contact_info':
        return (
          <div className="space-y-4">
            {renderLanguageTabs()}
            <div>
              <Label>Τίτλος ({activeLang.toUpperCase()})</Label>
              <Input
                value={getCurrentTitle()}
                onChange={(e) => updateTitle(e.target.value)}
                placeholder="Section title..."
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Αυτό το section χρησιμοποιεί δυναμικά δεδομένα από τις ρυθμίσεις του site.
            </p>
          </div>
        );

      case 'matterport':
        return (
          <div className="space-y-4">
            {renderLanguageTabs()}
            <div>
              <Label>Τίτλος ({activeLang.toUpperCase()})</Label>
              <Input
                value={getCurrentTitle()}
                onChange={(e) => updateTitle(e.target.value)}
                placeholder="3D Tour του Γυμναστηρίου..."
              />
            </div>
            <div>
              <Label>Υπότιτλος ({activeLang.toUpperCase()})</Label>
              <Input
                value={getCurrentSubtitle()}
                onChange={(e) => updateSubtitle(e.target.value)}
                placeholder="Εξερευνήστε τους χώρους μας εικονικά..."
              />
            </div>
            <div>
              <Label>Matterport URL ή Model ID</Label>
              <Input
                value={localSettings.matterport_url || ''}
                onChange={(e) => updateSettings('matterport_url', e.target.value)}
                placeholder="https://my.matterport.com/show/?m=XXXXXX ή απλά το ID"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Εισάγετε το embed URL, το share URL, ή μόνο το Model ID από το Matterport
              </p>
            </div>
            <div>
              <Label>Ύψος (px)</Label>
              <Input
                type="number"
                value={localSettings.height || '600'}
                onChange={(e) => updateSettings('height', e.target.value)}
                placeholder="600"
              />
            </div>
          </div>
        );

      default:
        return (
          <div className="space-y-4">
            {renderLanguageTabs()}
            <div>
              <Label>Τίτλος ({activeLang.toUpperCase()})</Label>
              <Input
                value={getCurrentTitle()}
                onChange={(e) => updateTitle(e.target.value)}
              />
            </div>
            <div>
              <Label>Περιεχόμενο ({activeLang.toUpperCase()})</Label>
              <Textarea
                value={getCurrentContent()}
                onChange={(e) => updateContent(e.target.value)}
                rows={4}
              />
            </div>
          </div>
        );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Επεξεργασία: {section.section_type}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="content">
          <TabsList className="mb-4">
            <TabsTrigger value="content">Περιεχόμενο</TabsTrigger>
            <TabsTrigger value="style">Στυλ</TabsTrigger>
          </TabsList>

          <TabsContent value="content">
            {renderContentFields()}
          </TabsContent>

          <TabsContent value="style">
            <div className="space-y-4">
              <div>
                <Label>Background</Label>
                <Select
                  value={section.background_color}
                  onValueChange={(value) => onUpdate({ background_color: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BACKGROUND_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Text Color</Label>
                <Select
                  value={section.text_color}
                  onValueChange={(value) => onUpdate({ text_color: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEXT_COLOR_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Hero-specific style options */}
              {section.section_type === 'hero' && (
                <>
                  <div className="border-t pt-4 mt-4">
                    <h4 className="font-medium mb-3">Ρυθμίσεις Hero</h4>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Μέγεθος Τίτλου</Label>
                      <Select
                        value={localSettings.title_size || 'large'}
                        onValueChange={(value) => updateSettings('title_size', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FONT_SIZE_OPTIONS.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Μέγεθος Υπότιτλου</Label>
                      <Select
                        value={localSettings.subtitle_size || 'medium'}
                        onValueChange={(value) => updateSettings('subtitle_size', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FONT_SIZE_OPTIONS.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Θέση Εικόνας</Label>
                      <Select
                        value={localSettings.image_position || 'center'}
                        onValueChange={(value) => updateSettings('image_position', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {IMAGE_POSITION_OPTIONS.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Μέγεθος Εικόνας</Label>
                      <Select
                        value={localSettings.image_size || 'cover'}
                        onValueChange={(value) => updateSettings('image_size', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {IMAGE_SIZE_OPTIONS.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label>Overlay (Διαφάνεια)</Label>
                    <Select
                      value={localSettings.overlay_enabled === false ? 'none' : (localSettings.overlay_color || 'dark')}
                      onValueChange={(value) => {
                        if (value === 'none') {
                          updateSettings('overlay_enabled', false);
                        } else {
                          updateSettings('overlay_enabled', true);
                          updateSettings('overlay_color', value);
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Χωρίς Overlay</SelectItem>
                        <SelectItem value="dark">Σκούρο</SelectItem>
                        <SelectItem value="light">Φωτεινό</SelectItem>
                        <SelectItem value="primary">Primary</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Ένταση Overlay: {localSettings.overlay_opacity || 20}%</Label>
                    <input
                      type="range"
                      min="0"
                      max="80"
                      step="5"
                      value={localSettings.overlay_opacity || 20}
                      onChange={(e) => updateSettings('overlay_opacity', parseInt(e.target.value))}
                      className="w-full mt-2"
                    />
                  </div>

                  <div className="border-t pt-4 mt-4">
                    <h4 className="font-medium mb-3">Animations</h4>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Animation Τίτλου</Label>
                      <Select
                        value={localSettings.title_animation || 'fade-up'}
                        onValueChange={(value) => updateSettings('title_animation', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ANIMATION_TYPE_OPTIONS.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Animation Υπότιτλου</Label>
                      <Select
                        value={localSettings.subtitle_animation || 'fade-up'}
                        onValueChange={(value) => updateSettings('subtitle_animation', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ANIMATION_TYPE_OPTIONS.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Animation Κουμπιών</Label>
                      <Select
                        value={localSettings.buttons_animation || 'fade-up'}
                        onValueChange={(value) => updateSettings('buttons_animation', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ANIMATION_TYPE_OPTIONS.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Ταχύτητα Animation</Label>
                      <Select
                        value={localSettings.animation_speed || 'normal'}
                        onValueChange={(value) => updateSettings('animation_speed', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ANIMATION_SPEED_OPTIONS.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label>Stagger Delay (μεταξύ elements)</Label>
                    <Select
                      value={localSettings.stagger_delay || '200'}
                      onValueChange={(value) => updateSettings('stagger_delay', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ANIMATION_DELAY_OPTIONS.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="border-t pt-4 mt-4">
                    <h4 className="font-medium mb-3">Parallax Effect</h4>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Parallax Εικόνας</Label>
                      <Select
                        value={localSettings.parallax_enabled ? 'true' : 'false'}
                        onValueChange={(value) => updateSettings('parallax_enabled', value === 'true')}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="false">Απενεργοποιημένο</SelectItem>
                          <SelectItem value="true">Ενεργοποιημένο</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Ένταση Parallax</Label>
                      <Select
                        value={localSettings.parallax_intensity || 'medium'}
                        onValueChange={(value) => updateSettings('parallax_intensity', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="subtle">Ελαφρύ (0.1)</SelectItem>
                          <SelectItem value="medium">Μεσαίο (0.3)</SelectItem>
                          <SelectItem value="strong">Έντονο (0.5)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="border-t pt-4 mt-4">
                    <h4 className="font-medium mb-3">Neon Effect</h4>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Neon Τίτλου</Label>
                      <Select
                        value={localSettings.neon_enabled ? 'true' : 'false'}
                        onValueChange={(value) => updateSettings('neon_enabled', value === 'true')}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="false">Απενεργοποιημένο</SelectItem>
                          <SelectItem value="true">Ενεργοποιημένο</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Χρώμα Neon</Label>
                      <Select
                        value={localSettings.neon_color || 'primary'}
                        onValueChange={(value) => updateSettings('neon_color', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="primary">Primary (Χρυσό)</SelectItem>
                          <SelectItem value="cyan">Cyan</SelectItem>
                          <SelectItem value="pink">Pink</SelectItem>
                          <SelectItem value="green">Green</SelectItem>
                          <SelectItem value="purple">Purple</SelectItem>
                          <SelectItem value="white">White</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label>Ένταση Neon Glow</Label>
                    <Select
                      value={localSettings.neon_intensity || 'medium'}
                      onValueChange={(value) => updateSettings('neon_intensity', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="subtle">Ελαφρύ</SelectItem>
                        <SelectItem value="medium">Μεσαίο</SelectItem>
                        <SelectItem value="strong">Έντονο</SelectItem>
                        <SelectItem value="extreme">Πολύ Έντονο</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}