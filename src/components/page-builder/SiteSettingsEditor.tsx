import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ImageUpload from '@/components/ImageUpload';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Palette, Building2, Phone, Star, Facebook, Instagram, Twitter, LayoutGrid, Languages, Loader2 } from 'lucide-react';
import { TikTokIcon } from '@/components/icons/TikTokIcon';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SiteSetting {
  id: string;
  setting_key: string;
  setting_value: string | null;
  setting_type: string;
  category: string;
}

interface SiteSettingsEditorProps {
  settings: SiteSetting[];
  onUpdate: (settingKey: string, value: string | null) => void;
}

export function SiteSettingsEditor({ settings, onUpdate }: SiteSettingsEditorProps) {
  const getSetting = (key: string) => settings.find(s => s.setting_key === key)?.setting_value || '';
  const [translating, setTranslating] = useState(false);

  const autoTranslateHours = async () => {
    const weekdayEl = getSetting('working_hours_weekday_el');
    const weekendEl = getSetting('working_hours_weekend_el');
    if (!weekdayEl && !weekendEl) {
      toast.error('Συμπλήρωσε πρώτα τα Ελληνικά πεδία');
      return;
    }
    setTranslating(true);
    try {
      const translate = async (text: string) => {
        if (!text) return '';
        const { data, error } = await supabase.functions.invoke('translate-content', {
          body: { text, targetLanguage: 'en' },
        });
        if (error) throw error;
        return data.translatedText || '';
      };
      const [weekdayEn, weekendEn] = await Promise.all([
        weekdayEl ? translate(weekdayEl) : Promise.resolve(''),
        weekendEl ? translate(weekendEl) : Promise.resolve(''),
      ]);
      if (weekdayEn) onUpdate('working_hours_weekday_en', weekdayEn);
      if (weekendEn) onUpdate('working_hours_weekend_en', weekendEn);
      toast.success('Μετάφραση ολοκληρώθηκε!');
    } catch (e) {
      console.error('Translation error:', e);
      toast.error('Σφάλμα μετάφρασης');
    } finally {
      setTranslating(false);
    }
  };

  const brandingSettings = settings.filter(s => s.category === 'branding');
  const colorSettings = settings.filter(s => s.category === 'colors');
  const generalSettings = settings.filter(s => s.category === 'general');

  return (
    <Tabs defaultValue="branding">
      <TabsList className="mb-6 flex-wrap">
        <TabsTrigger value="branding" className="flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          Branding
        </TabsTrigger>
        <TabsTrigger value="colors" className="flex items-center gap-2">
          <Palette className="h-4 w-4" />
          Χρώματα
        </TabsTrigger>
        <TabsTrigger value="contact" className="flex items-center gap-2">
          <Phone className="h-4 w-4" />
          Επικοινωνία
        </TabsTrigger>
        <TabsTrigger value="footer" className="flex items-center gap-2">
          <LayoutGrid className="h-4 w-4" />
          Footer
        </TabsTrigger>
      </TabsList>

      <TabsContent value="branding">
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Όνομα Site</CardTitle>
              <CardDescription>Το όνομα που εμφανίζεται στο navigation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Εμφάνιση Τίτλου</Label>
                  <p className="text-xs text-muted-foreground">
                    Εμφάνιση/απόκρυψη του ονόματος στο navigation
                  </p>
                </div>
                <Switch
                  checked={getSetting('site_name_visible') !== 'false'}
                  onCheckedChange={(checked) => onUpdate('site_name_visible', checked.toString())}
                />
              </div>
              
              <Input
                value={getSetting('site_name')}
                onChange={(e) => onUpdate('site_name', e.target.value)}
                placeholder="Star Gym"
              />
              
              <div className="space-y-2 pt-4 border-t">
                <Label>Γραμματοσειρά Τίτλου</Label>
                <Select
                  value={getSetting('site_name_font') || 'default'}
                  onValueChange={(value) => onUpdate('site_name_font', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Επιλέξτε γραμματοσειρά" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default (System)</SelectItem>
                    <SelectItem value="Bebas Neue">Bebas Neue</SelectItem>
                    <SelectItem value="Montserrat">Montserrat</SelectItem>
                    <SelectItem value="Oswald">Oswald</SelectItem>
                    <SelectItem value="Playfair Display">Playfair Display</SelectItem>
                    <SelectItem value="Poppins">Poppins</SelectItem>
                    <SelectItem value="Roboto">Roboto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2 pt-4 border-t">
                <Label>Χρώμα Τίτλου</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={getSetting('site_name_color') || '#ffffff'}
                    onChange={(e) => onUpdate('site_name_color', e.target.value)}
                    className="w-16 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    value={getSetting('site_name_color') || '#ffffff'}
                    onChange={(e) => onUpdate('site_name_color', e.target.value)}
                    placeholder="#ffffff"
                    className="flex-1"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Το χρώμα του τίτλου στο navigation bar
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Logo</CardTitle>
              <CardDescription>Ανεβάστε το logo του site</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ImageUpload
                currentImageUrl={getSetting('logo_url')}
                onImageUploaded={(url) => onUpdate('logo_url', url)}
                bucket="cms-images"
                folder="branding"
              />
              
              <div className="space-y-2 pt-4 border-t">
                <Label>Μέγεθος Logo (px)</Label>
                <div className="flex items-center gap-4">
                  <Slider
                    value={[parseInt(getSetting('logo_size') || '32')]}
                    onValueChange={(value) => onUpdate('logo_size', value[0].toString())}
                    min={16}
                    max={64}
                    step={4}
                    className="flex-1"
                  />
                  <span className="text-sm font-medium w-12 text-right">
                    {getSetting('logo_size') || '32'}px
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Επιλέξτε το ύψος του logo (16-64px)
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-4 w-4" />
                Favicon
              </CardTitle>
              <CardDescription>Το εικονίδιο που εμφανίζεται στην καρτέλα του browser</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Browser Tab Preview */}
              {getSetting('favicon_url') && (
                <div className="space-y-2">
                  <Label>Preview</Label>
                  <div className="bg-muted rounded-lg p-3">
                    {/* Browser Window Mockup */}
                    <div className="bg-background border rounded-lg shadow-sm overflow-hidden">
                      {/* Browser Tab Bar */}
                      <div className="bg-muted/50 border-b px-2 py-1.5 flex items-center gap-1">
                        {/* Tab */}
                        <div className="bg-background border border-b-0 rounded-t-md px-3 py-1.5 flex items-center gap-2 max-w-[200px]">
                          <img 
                            src={getSetting('favicon_url')} 
                            alt="Favicon preview" 
                            className="w-4 h-4 object-contain flex-shrink-0"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                          <span className="text-xs truncate text-foreground">
                            {getSetting('site_name') || 'Star Gym'}
                          </span>
                          <span className="text-muted-foreground text-xs ml-auto">×</span>
                        </div>
                        {/* Empty tab indicator */}
                        <div className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground text-lg hover:bg-muted">
                          +
                        </div>
                      </div>
                      {/* URL Bar */}
                      <div className="bg-muted/30 px-3 py-1.5 flex items-center gap-2">
                        <div className="flex gap-1">
                          <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/30"></div>
                          <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/30"></div>
                        </div>
                        <div className="flex-1 bg-background border rounded-full px-3 py-0.5 text-xs text-muted-foreground">
                          {window.location.origin}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <ImageUpload
                currentImageUrl={getSetting('favicon_url')}
                onImageUploaded={(url) => onUpdate('favicon_url', url)}
                bucket="cms-images"
                folder="branding"
              />
              <p className="text-xs text-muted-foreground">
                Προτεινόμενες διαστάσεις: 32x32 ή 64x64 pixels. Υποστηριζόμενα formats: PNG, ICO, SVG
              </p>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Navigation Bar Style</CardTitle>
              <CardDescription>Ρυθμίσεις εμφάνισης του navigation bar</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Χρώμα Background</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={getSetting('nav_bg_color') || '#000000'}
                      onChange={(e) => onUpdate('nav_bg_color', e.target.value)}
                      className="w-16 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={getSetting('nav_bg_color') || ''}
                      onChange={(e) => onUpdate('nav_bg_color', e.target.value)}
                      placeholder="Κενό = default theme"
                      className="flex-1"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Αφήστε κενό για να χρησιμοποιηθεί το default theme χρώμα
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Χρώμα Κειμένου Links</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={getSetting('nav_text_color') || '#ffffff'}
                      onChange={(e) => onUpdate('nav_text_color', e.target.value)}
                      className="w-16 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={getSetting('nav_text_color') || ''}
                      onChange={(e) => onUpdate('nav_text_color', e.target.value)}
                      placeholder="Κενό = default"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-4 border-t">
                <Label>Διαφάνεια (Opacity): {getSetting('nav_opacity') || '80'}%</Label>
                <Slider
                  value={[parseInt(getSetting('nav_opacity') || '80')]}
                  onValueChange={(value) => onUpdate('nav_opacity', value[0].toString())}
                  min={0}
                  max={100}
                  step={5}
                />
                <p className="text-xs text-muted-foreground">
                  0% = πλήρως διαφανές, 100% = αδιαφανές
                </p>
              </div>

              <div className="space-y-2 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Backdrop Blur</Label>
                    <p className="text-xs text-muted-foreground">
                      Εφέ θολώματος στο φόντο πίσω από το navigation
                    </p>
                  </div>
                  <Switch
                    checked={getSetting('nav_blur') !== 'false'}
                    onCheckedChange={(checked) => onUpdate('nav_blur', checked.toString())}
                  />
                </div>
              </div>

              {/* Preview */}
              <div className="pt-4 border-t">
                <Label className="mb-2 block">Preview</Label>
                <div 
                  className="rounded-lg p-3 flex items-center justify-between"
                  style={{
                    backgroundColor: getSetting('nav_bg_color') 
                      ? `${getSetting('nav_bg_color')}${Math.round((parseInt(getSetting('nav_opacity') || '80') / 100) * 255).toString(16).padStart(2, '0')}`
                      : `rgba(0,0,0,${parseInt(getSetting('nav_opacity') || '80') / 100})`,
                    color: getSetting('nav_text_color') || '#ffffff',
                    backdropFilter: getSetting('nav_blur') !== 'false' ? 'blur(12px)' : 'none',
                  }}
                >
                  <span className="font-bold">{getSetting('site_name') || 'Star Gym'}</span>
                  <div className="flex gap-4 text-sm">
                    <span>Αρχική</span>
                    <span>Μαθήματα</span>
                    <span>Επικοινωνία</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="colors">
        <Card>
          <CardHeader>
            <CardTitle>Χρωματική Παλέτα</CardTitle>
            <CardDescription>Επιλέξτε τα κύρια χρώματα του site</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label>Primary Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={getSetting('primary_color') || '#667eea'}
                    onChange={(e) => onUpdate('primary_color', e.target.value)}
                    className="w-16 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    value={getSetting('primary_color') || '#667eea'}
                    onChange={(e) => onUpdate('primary_color', e.target.value)}
                    placeholder="#667eea"
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Accent Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={getSetting('accent_color') || '#764ba2'}
                    onChange={(e) => onUpdate('accent_color', e.target.value)}
                    className="w-16 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    value={getSetting('accent_color') || '#764ba2'}
                    onChange={(e) => onUpdate('accent_color', e.target.value)}
                    placeholder="#764ba2"
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Secondary Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={getSetting('secondary_color') || '#1a1a2e'}
                    onChange={(e) => onUpdate('secondary_color', e.target.value)}
                    className="w-16 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    value={getSetting('secondary_color') || '#1a1a2e'}
                    onChange={(e) => onUpdate('secondary_color', e.target.value)}
                    placeholder="#1a1a2e"
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              Σημείωση: Οι αλλαγές χρωμάτων θα εφαρμοστούν σε όλο το site.
            </p>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="contact">
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Στοιχεία Επικοινωνίας</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  value={getSetting('contact_email')}
                  onChange={(e) => onUpdate('contact_email', e.target.value)}
                  placeholder="info@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Τηλέφωνο</Label>
                <Input
                  value={getSetting('contact_phone')}
                  onChange={(e) => onUpdate('contact_phone', e.target.value)}
                  placeholder="+30 210 123 4567"
                />
              </div>
              <div className="space-y-2">
                <Label>Δεύτερο Τηλέφωνο</Label>
                <Input
                  value={getSetting('contact_phone_2')}
                  onChange={(e) => onUpdate('contact_phone_2', e.target.value)}
                  placeholder="+30 210 765 4321"
                />
              </div>
              <div className="space-y-2">
                <Label>Διεύθυνση</Label>
                <Input
                  value={getSetting('contact_address')}
                  onChange={(e) => onUpdate('contact_address', e.target.value)}
                  placeholder="123 Street, City"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ωράριο Λειτουργίας</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm font-medium text-muted-foreground">🇬🇷 Ελληνικά</p>
              <div className="space-y-2">
                <Label>Καθημερινές (EL)</Label>
                <Input
                  value={getSetting('working_hours_weekday_el')}
                  onChange={(e) => onUpdate('working_hours_weekday_el', e.target.value)}
                  placeholder="Δευτέρα - Παρασκευή: 06:00 - 23:00"
                />
              </div>
              <div className="space-y-2">
                <Label>Σαββατοκύριακο (EL)</Label>
                <Input
                  value={getSetting('working_hours_weekend_el')}
                  onChange={(e) => onUpdate('working_hours_weekend_el', e.target.value)}
                  placeholder="Σάββατο - Κυριακή: 08:00 - 21:00"
                />
              </div>
              <p className="text-sm font-medium text-muted-foreground mt-4">🇬🇧 English</p>
              <div className="space-y-2">
                <Label>Weekdays (EN)</Label>
                <Input
                  value={getSetting('working_hours_weekday_en')}
                  onChange={(e) => onUpdate('working_hours_weekday_en', e.target.value)}
                  placeholder="Monday - Friday: 6:00 AM - 11:00 PM"
                />
              </div>
              <div className="space-y-2">
                <Label>Weekend (EN)</Label>
                <Input
                  value={getSetting('working_hours_weekend_en')}
                  onChange={(e) => onUpdate('working_hours_weekend_en', e.target.value)}
                  placeholder="Saturday - Sunday: 8:00 AM - 9:00 PM"
                />
              </div>
              <div className="flex items-center gap-3 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={autoTranslateHours}
                  disabled={translating}
                >
                  {translating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Languages className="h-4 w-4" />}
                  {translating ? 'Μετάφραση...' : 'Αυτόματη μετάφραση EL → EN'}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Συμπλήρωσε τα Ελληνικά και πάτα για αυτόματη μετάφραση στα Αγγλικά
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Social Media</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Facebook className="h-4 w-4 text-[#1877F2]" />
                    Facebook
                  </Label>
                  <Input
                    value={getSetting('facebook_url')}
                    onChange={(e) => onUpdate('facebook_url', e.target.value)}
                    placeholder="https://facebook.com/yourpage"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Instagram className="h-4 w-4 text-[#E4405F]" />
                    Instagram
                  </Label>
                  <Input
                    value={getSetting('instagram_url')}
                    onChange={(e) => onUpdate('instagram_url', e.target.value)}
                    placeholder="https://instagram.com/yourpage"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Twitter className="h-4 w-4 text-[#1DA1F2]" />
                    Twitter / X
                  </Label>
                  <Input
                    value={getSetting('twitter_url')}
                    onChange={(e) => onUpdate('twitter_url', e.target.value)}
                    placeholder="https://twitter.com/yourpage"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <TikTokIcon className="h-4 w-4" />
                    TikTok
                  </Label>
                  <Input
                    value={getSetting('tiktok_url')}
                    onChange={(e) => onUpdate('tiktok_url', e.target.value)}
                    placeholder="https://tiktok.com/@yourpage"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                Τα social media links θα εμφανίζονται στο footer και στη σελίδα επικοινωνίας
              </p>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="footer">
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Ρυθμίσεις Footer</CardTitle>
              <CardDescription>
                Το footer εμφανίζεται στο κάτω μέρος όλων των σελίδων. 
                Τα Quick Links συνδέονται αυτόματα με το Navigation menu.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Tagline / Περιγραφή</Label>
                <Textarea
                  value={getSetting('footer_tagline')}
                  onChange={(e) => onUpdate('footer_tagline', e.target.value)}
                  placeholder="Το γυμναστήριο που θα αλλάξει τη ζωή σου..."
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Εμφανίζεται κάτω από το όνομα στο footer
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Links</CardTitle>
              <CardDescription>Αυτόματη σύνδεση με Navigation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">
                  Τα Quick Links στο footer εμφανίζουν αυτόματα τα ίδια links με το Navigation menu.
                </p>
                <p className="text-sm text-muted-foreground">
                  Για να αλλάξετε τα links, πηγαίνετε στην καρτέλα <strong>"Διαχείριση Navigation"</strong>.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Επικοινωνία & Social</CardTitle>
              <CardDescription>Αυτόματη σύνδεση</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">
                  Τα στοιχεία επικοινωνίας (τηλέφωνο, email, διεύθυνση, ωράριο) και τα social media εμφανίζονται αυτόματα στο footer.
                </p>
                <p className="text-sm text-muted-foreground">
                  Για να τα αλλάξετε, πηγαίνετε στην καρτέλα <strong>"Επικοινωνία"</strong>.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>
    </Tabs>
  );
}