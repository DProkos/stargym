import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AppSidebarAdmin } from '@/components/app-sidebar-admin';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, Upload } from 'lucide-react';
import ImageUpload from '@/components/ImageUpload';

interface InvoiceSettings {
  id: string;
  company_name: string;
  company_address: string;
  company_phone: string;
  company_email: string;
  company_tax_id: string;
  company_logo_url: string;
  brand_color: string;
  invoice_prefix: string;
  next_invoice_number: number;
  default_tax_rate: number;
  default_payment_terms: string;
  footer_text: string;
  bank_details: string;
}

export default function InvoiceSettings() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<InvoiceSettings | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadSettings();
    }
  }, [isAdmin]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/auth');
      return;
    }

    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id);

    const hasAdminRole = roles?.some(r => r.role === 'admin');
    if (!hasAdminRole) {
      navigate('/');
      return;
    }

    setIsAdmin(true);
    setLoading(false);
  };

  const loadSettings = async () => {
    const { data, error } = await supabase
      .from('invoice_settings')
      .select('*')
      .single();

    if (error) {
      toast({ title: 'Error loading settings', variant: 'destructive' });
      return;
    }

    setSettings(data);
  };

  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();

    const { error } = await supabase
      .from('invoice_settings')
      .update({
        company_name: settings.company_name,
        company_address: settings.company_address,
        company_phone: settings.company_phone,
        company_email: settings.company_email,
        company_tax_id: settings.company_tax_id,
        company_logo_url: settings.company_logo_url,
        brand_color: settings.brand_color,
        invoice_prefix: settings.invoice_prefix,
        default_tax_rate: settings.default_tax_rate,
        default_payment_terms: settings.default_payment_terms,
        footer_text: settings.footer_text,
        bank_details: settings.bank_details,
        updated_by: session?.user.id
      })
      .eq('id', settings.id);

    if (error) {
      toast({ title: 'Error saving settings', variant: 'destructive' });
      setSaving(false);
      return;
    }

    toast({ title: 'Settings saved successfully' });
    setSaving(false);
  };

  const handleLogoUpload = (url: string) => {
    if (settings) {
      setSettings({ ...settings, company_logo_url: url });
    }
  };

  if (loading || !isAdmin || !settings) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebarAdmin />
        <main className="flex-1 overflow-auto">
          <header className="h-14 sm:h-16 border-b sticky top-0 bg-background z-30 flex items-center px-3 sm:px-6 gap-2">
            <SidebarTrigger />
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin/invoices')}>
              <ArrowLeft className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Πίσω</span>
            </Button>
            <h1 className="text-base sm:text-2xl font-bold truncate ml-2">Ρυθμίσεις Τιμολογίων</h1>
          </header>
          <div className="p-3 sm:p-6">
          <div className="mb-4 sm:mb-6">
            <p className="text-sm sm:text-base text-muted-foreground">
              Προσαρμόστε τις ρυθμίσεις PDF και τα στοιχεία της εταιρείας
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Company Information */}
            <Card>
              <CardHeader>
                <CardTitle>Στοιχεία Εταιρείας</CardTitle>
                <CardDescription>
                  Βασικές πληροφορίες που εμφανίζονται στα τιμολόγια
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Όνομα Εταιρείας</Label>
                  <Input
                    value={settings.company_name}
                    onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                  />
                </div>

                <div>
                  <Label>Διεύθυνση</Label>
                  <Textarea
                    value={settings.company_address || ''}
                    onChange={(e) => setSettings({ ...settings, company_address: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Τηλέφωνο</Label>
                    <Input
                      value={settings.company_phone || ''}
                      onChange={(e) => setSettings({ ...settings, company_phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={settings.company_email || ''}
                      onChange={(e) => setSettings({ ...settings, company_email: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <Label>ΑΦΜ / Tax ID</Label>
                  <Input
                    value={settings.company_tax_id || ''}
                    onChange={(e) => setSettings({ ...settings, company_tax_id: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Logo Upload & Brand Color */}
            <Card>
              <CardHeader>
                <CardTitle>Logo & Χρώματα Εταιρείας</CardTitle>
                <CardDescription>
                  Το logo και το χρώμα θα εμφανίζονται στα PDF τιμολόγια
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Brand Color</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="color"
                      value={settings.brand_color || '#667eea'}
                      onChange={(e) => setSettings({ ...settings, brand_color: e.target.value })}
                      className="w-20 h-10"
                    />
                    <Input
                      type="text"
                      value={settings.brand_color || '#667eea'}
                      onChange={(e) => setSettings({ ...settings, brand_color: e.target.value })}
                      placeholder="#667eea"
                      className="flex-1"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Το χρώμα που θα χρησιμοποιείται για headers και πίνακες στα PDF
                  </p>
                </div>
                
                <div>
                  <Label>Company Logo</Label>
                  <ImageUpload
                    currentImageUrl={settings.company_logo_url || ''}
                    onImageUploaded={handleLogoUpload}
                    bucket="cms-images"
                    folder="logos"
                  />
                  {settings.company_logo_url && (
                    <div className="mt-4">
                      <p className="text-sm text-muted-foreground mb-2">Current Logo:</p>
                      <img
                        src={settings.company_logo_url}
                        alt="Company Logo"
                        className="max-w-xs h-auto border rounded"
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Invoice Configuration */}
            <Card>
              <CardHeader>
                <CardTitle>Ρυθμίσεις Αρίθμησης</CardTitle>
                <CardDescription>
                  Διαμόρφωση αριθμών τιμολογίων
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Invoice Prefix</Label>
                  <Input
                    value={settings.invoice_prefix}
                    onChange={(e) => setSettings({ ...settings, invoice_prefix: e.target.value })}
                    placeholder="π.χ. INV"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Format: {settings.invoice_prefix}-000001
                  </p>
                </div>

                <div>
                  <Label>Επόμενος Αριθμός</Label>
                  <Input
                    type="number"
                    value={settings.next_invoice_number}
                    onChange={(e) => setSettings({ ...settings, next_invoice_number: parseInt(e.target.value) })}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Επόμενο τιμολόγιο: {settings.invoice_prefix}-{String(settings.next_invoice_number).padStart(6, '0')}
                  </p>
                </div>

                <div>
                  <Label>Προεπιλεγμένος Φόρος (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={settings.default_tax_rate}
                    onChange={(e) => setSettings({ ...settings, default_tax_rate: parseFloat(e.target.value) })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Payment & Footer Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Πληρωμές & Footer</CardTitle>
                <CardDescription>
                  Όροι πληρωμής και footer text
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Όροι Πληρωμής</Label>
                  <Textarea
                    value={settings.default_payment_terms || ''}
                    onChange={(e) => setSettings({ ...settings, default_payment_terms: e.target.value })}
                    rows={3}
                    placeholder="π.χ. Payment due within 30 days"
                  />
                </div>

                <div>
                  <Label>Τραπεζικά Στοιχεία</Label>
                  <Textarea
                    value={settings.bank_details || ''}
                    onChange={(e) => setSettings({ ...settings, bank_details: e.target.value })}
                    rows={3}
                    placeholder="IBAN, Bank Name, κλπ."
                  />
                </div>

                <div>
                  <Label>Footer Text</Label>
                  <Textarea
                    value={settings.footer_text || ''}
                    onChange={(e) => setSettings({ ...settings, footer_text: e.target.value })}
                    rows={2}
                    placeholder="π.χ. Thank you for your business!"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-6 flex justify-end">
            <Button onClick={handleSave} disabled={saving} size="lg">
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Αποθήκευση...' : 'Αποθήκευση Ρυθμίσεων'}
            </Button>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}