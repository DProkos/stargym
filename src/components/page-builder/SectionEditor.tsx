import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ImageUpload from '@/components/ImageUpload';
import { Plus, Trash2 } from 'lucide-react';

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

export function SectionEditor({ section, onUpdate }: SectionEditorProps) {
  const [localSettings, setLocalSettings] = useState(section.settings || {});
  const [activeLang, setActiveLang] = useState<'el' | 'en'>('el');

  useEffect(() => {
    setLocalSettings(section.settings || {});
  }, [section.id]);

  const updateSettings = (key: string, value: any) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    onUpdate({ settings: newSettings });
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

  const renderLanguageTabs = () => (
    <div className="flex gap-2 mb-4">
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
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}