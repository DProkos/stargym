import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ImageUpload from '@/components/ImageUpload';
import { Slider } from '@/components/ui/slider';
import { Palette, Building2, Phone, Star, Facebook, Instagram, Twitter } from 'lucide-react';

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

  const brandingSettings = settings.filter(s => s.category === 'branding');
  const colorSettings = settings.filter(s => s.category === 'colors');
  const generalSettings = settings.filter(s => s.category === 'general');

  return (
    <Tabs defaultValue="branding">
      <TabsList className="mb-6">
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
      </TabsList>

      <TabsContent value="branding">
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Όνομα Site</CardTitle>
              <CardDescription>Το όνομα που εμφανίζεται στο navigation</CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                value={getSetting('site_name')}
                onChange={(e) => onUpdate('site_name', e.target.value)}
                placeholder="Star Gym"
              />
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
              <div className="space-y-2">
                <Label>Καθημερινές</Label>
                <Input
                  value={getSetting('working_hours_weekday')}
                  onChange={(e) => onUpdate('working_hours_weekday', e.target.value)}
                  placeholder="Monday - Friday: 6:00 AM - 11:00 PM"
                />
              </div>
              <div className="space-y-2">
                <Label>Σαββατοκύριακο</Label>
                <Input
                  value={getSetting('working_hours_weekend')}
                  onChange={(e) => onUpdate('working_hours_weekend', e.target.value)}
                  placeholder="Saturday - Sunday: 8:00 AM - 9:00 PM"
                />
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
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                Τα social media links θα εμφανίζονται στο footer και στη σελίδα επικοινωνίας
              </p>
            </CardContent>
          </Card>
        </div>
      </TabsContent>
    </Tabs>
  );
}