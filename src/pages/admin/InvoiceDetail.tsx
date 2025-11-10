import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AppSidebarAdmin } from '@/components/app-sidebar-admin';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, Download, Send, Plus, X, Package } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { generateInvoicePDF, downloadPDF } from '@/utils/invoicePDFGenerator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

interface InvoiceItem {
  id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  sort_order: number;
}

interface ServicePackage {
  id: string;
  name: string;
  description: string;
  price: number;
  duration_months: number;
  sessions_included: number;
}

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isNew = id === 'new';
  const autoDownload = searchParams.get('download') === 'true';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [invoiceSettings, setInvoiceSettings] = useState<any>(null);
  const [showPackagesDialog, setShowPackagesDialog] = useState(false);

  // Invoice fields
  const [customerId, setCustomerId] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [status, setStatus] = useState('draft');
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [taxRate, setTaxRate] = useState(24);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [notes, setNotes] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');

  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (autoDownload && !isNew && id) {
      handleDownloadPDF();
    }
  }, [autoDownload, id, isNew]);

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

    await loadData();
    setLoading(false);
  };

  const loadData = async () => {
    await Promise.all([
      loadCustomers(),
      loadPackages(),
      loadInvoiceSettings(),
      !isNew && id ? loadInvoice() : Promise.resolve()
    ]);
  };

  const loadCustomers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .order('full_name');
    
    setCustomers(data || []);
  };

  const loadPackages = async () => {
    const { data } = await supabase
      .from('service_packages')
      .select('*')
      .eq('is_active', true)
      .order('price');

    const packagesWithFeatures = (data || []).map(pkg => ({
      ...pkg,
      features: Array.isArray(pkg.features) ? pkg.features as string[] : []
    }));

    setPackages(packagesWithFeatures);
  };

  const loadInvoiceSettings = async () => {
    const { data } = await supabase
      .from('invoice_settings')
      .select('*')
      .single();

    if (data) {
      setInvoiceSettings(data);
      setTaxRate(data.default_tax_rate);
      setPaymentTerms(data.default_payment_terms || '');
    }
  };

  const loadInvoice = async () => {
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select(`
        *,
        invoice_items (*)
      `)
      .eq('id', id)
      .single();

    if (error || !invoice) {
      toast({ title: 'Error loading invoice', variant: 'destructive' });
      return;
    }

    setCustomerId(invoice.customer_id);
    setIssueDate(invoice.issue_date);
    setDueDate(invoice.due_date);
    setStatus(invoice.status);
    setTaxRate(invoice.tax_rate);
    setDiscountAmount(parseFloat(String(invoice.discount_amount)));
    setNotes(invoice.notes || '');
    setPaymentTerms(invoice.payment_terms || '');
    
    const loadedItems = (invoice.invoice_items || []).map((item: any) => ({
      id: item.id,
      description: item.description,
      quantity: parseFloat(String(item.quantity)),
      unit_price: parseFloat(String(item.unit_price)),
      total_price: parseFloat(String(item.total_price)),
      sort_order: item.sort_order
    }));
    
    setItems(loadedItems);
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.total_price, 0);
    const discountedSubtotal = subtotal - discountAmount;
    const taxAmount = (discountedSubtotal * taxRate) / 100;
    const total = discountedSubtotal + taxAmount;

    return { subtotal, taxAmount, total };
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        description: '',
        quantity: 1,
        unit_price: 0,
        total_price: 0,
        sort_order: items.length
      }
    ]);
  };

  const handleAddPackage = (pkg: ServicePackage) => {
    const description = `${pkg.name} - ${pkg.duration_months} month(s), ${pkg.sessions_included} sessions`;
    
    setItems([
      ...items,
      {
        description,
        quantity: 1,
        unit_price: parseFloat(String(pkg.price)),
        total_price: parseFloat(String(pkg.price)),
        sort_order: items.length
      }
    ]);
    
    setShowPackagesDialog(false);
    toast({ title: 'Package added to invoice' });
  };

  const handleUpdateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    if (field === 'quantity' || field === 'unit_price') {
      newItems[index].total_price = newItems[index].quantity * newItems[index].unit_price;
    }
    
    setItems(newItems);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!customerId) {
      toast({ title: 'Please select a customer', variant: 'destructive' });
      return;
    }

    if (items.length === 0) {
      toast({ title: 'Please add at least one item', variant: 'destructive' });
      return;
    }

    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    const { subtotal, taxAmount, total } = calculateTotals();

    try {
      if (isNew) {
        // Generate invoice number
        const { data: invoiceNumber } = await supabase.rpc('generate_invoice_number');

        // Create invoice
        const { data: invoice, error: invoiceError } = await supabase
          .from('invoices')
          .insert({
            invoice_number: invoiceNumber,
            customer_id: customerId,
            issue_date: issueDate,
            due_date: dueDate,
            status,
            subtotal,
            tax_rate: taxRate,
            tax_amount: taxAmount,
            discount_amount: discountAmount,
            total_amount: total,
            notes,
            payment_terms: paymentTerms,
            created_by: session?.user.id
          })
          .select()
          .single();

        if (invoiceError) throw invoiceError;

        // Create invoice items
        const itemsToInsert = items.map((item, index) => ({
          invoice_id: invoice.id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          sort_order: index
        }));

        const { error: itemsError } = await supabase
          .from('invoice_items')
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;

        toast({ title: 'Invoice created successfully' });
        navigate(`/admin/invoices/${invoice.id}`);
      } else {
        // Update invoice
        const { error: invoiceError } = await supabase
          .from('invoices')
          .update({
            customer_id: customerId,
            issue_date: issueDate,
            due_date: dueDate,
            status,
            subtotal,
            tax_rate: taxRate,
            tax_amount: taxAmount,
            discount_amount: discountAmount,
            total_amount: total,
            notes,
            payment_terms: paymentTerms
          })
          .eq('id', id);

        if (invoiceError) throw invoiceError;

        // Delete old items
        await supabase
          .from('invoice_items')
          .delete()
          .eq('invoice_id', id);

        // Insert new items
        const itemsToInsert = items.map((item, index) => ({
          invoice_id: id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          sort_order: index
        }));

        const { error: itemsError } = await supabase
          .from('invoice_items')
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;

        toast({ title: 'Invoice updated successfully' });
        loadInvoice();
      }
    } catch (error: any) {
      toast({ title: 'Error saving invoice', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (isNew || !customerId || items.length === 0) {
      toast({ title: 'Please save the invoice first', variant: 'destructive' });
      return;
    }

    try {
      const customer = customers.find(c => c.id === customerId);
      const { subtotal, taxAmount, total } = calculateTotals();

      // Get invoice number
      let invoiceNumber = 'DRAFT';
      if (!isNew) {
        const { data: invoice } = await supabase
          .from('invoices')
          .select('invoice_number')
          .eq('id', id)
          .single();
        
        if (invoice) {
          invoiceNumber = invoice.invoice_number;
        }
      }

      const invoiceData = {
        invoice_number: invoiceNumber,
        issue_date: issueDate,
        due_date: dueDate,
        customer: {
          full_name: customer?.full_name || '',
          email: customer?.email || '',
          phone: customer?.phone || ''
        },
        items: items.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price
        })),
        subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        discount_amount: discountAmount,
        total_amount: total,
        notes,
        payment_terms: paymentTerms
      };

      const companySettings = {
        company_name: invoiceSettings?.company_name || 'Vigor Track',
        company_address: invoiceSettings?.company_address || '',
        company_phone: invoiceSettings?.company_phone || '',
        company_email: invoiceSettings?.company_email || '',
        company_tax_id: invoiceSettings?.company_tax_id || '',
        company_logo_url: invoiceSettings?.company_logo_url || '',
        footer_text: invoiceSettings?.footer_text || '',
        bank_details: invoiceSettings?.bank_details || ''
      };

      const pdfBlob = await generateInvoicePDF(invoiceData, companySettings);
      downloadPDF(pdfBlob, `${invoiceNumber}.pdf`);

      toast({ title: 'PDF downloaded successfully' });
    } catch (error: any) {
      toast({ title: 'Error generating PDF', description: error.message, variant: 'destructive' });
    }
  };

  const handleSendEmail = async () => {
    if (isNew) {
      toast({ 
        title: 'Σφάλμα',
        description: 'Παρακαλώ αποθηκεύστε πρώτα το τιμολόγιο',
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsSending(true);

      const { data, error } = await supabase.functions.invoke('send-invoice-email', {
        body: { invoice_id: id }
      });

      if (error) throw error;

      toast({
        title: 'Επιτυχία',
        description: `Το τιμολόγιο στάλθηκε στον πελάτη: ${data.recipient}`,
      });
    } catch (error: any) {
      console.error('Error sending invoice email:', error);
      toast({
        title: 'Σφάλμα',
        description: error.message || 'Αποτυχία αποστολής email',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  const { subtotal, taxAmount, total } = calculateTotals();

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebarAdmin />
        <main className="flex-1 p-6 overflow-auto">
          <div className="mb-6 flex items-center justify-between">
            <Button variant="ghost" onClick={() => navigate('/admin/invoices')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Πίσω στα Τιμολόγια
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleDownloadPDF} disabled={isNew}>
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
              <Button variant="outline" onClick={handleSendEmail} disabled={isNew || isSending}>
                <Send className="h-4 w-4 mr-2" />
                {isSending ? 'Αποστολή...' : 'Αποστολή Email'}
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Αποθήκευση...' : 'Αποθήκευση'}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Invoice Details */}
              <Card>
                <CardHeader>
                  <CardTitle>{isNew ? 'Νέο Τιμολόγιο' : 'Επεξεργασία Τιμολογίου'}</CardTitle>
                  <CardDescription>Στοιχεία τιμολογίου</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Πελάτης *</Label>
                    <Select value={customerId} onValueChange={setCustomerId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Επιλέξτε πελάτη..." />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map(customer => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.full_name} ({customer.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Ημερομηνία Έκδοσης</Label>
                      <Input
                        type="date"
                        value={issueDate}
                        onChange={(e) => setIssueDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Ημερομηνία Λήξης</Label>
                      <Input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Status</Label>
                      <Select value={status} onValueChange={setStatus}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="sent">Sent</SelectItem>
                          <SelectItem value="paid">Paid</SelectItem>
                          <SelectItem value="overdue">Overdue</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Invoice Items */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Προϊόντα / Υπηρεσίες</CardTitle>
                      <CardDescription>Προσθέστε items στο τιμολόγιο</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setShowPackagesDialog(true)}>
                        <Package className="h-4 w-4 mr-2" />
                        Από Πακέτο
                      </Button>
                      <Button size="sm" onClick={handleAddItem}>
                        <Plus className="h-4 w-4 mr-2" />
                        Προσθήκη Item
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {items.map((item, index) => (
                      <div key={index} className="grid grid-cols-12 gap-2 items-start p-3 border rounded">
                        <div className="col-span-5">
                          <Input
                            placeholder="Περιγραφή"
                            value={item.description}
                            onChange={(e) => handleUpdateItem(index, 'description', e.target.value)}
                          />
                        </div>
                        <div className="col-span-2">
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="Ποσότητα"
                            value={item.quantity}
                            onChange={(e) => handleUpdateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div className="col-span-2">
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="Τιμή"
                            value={item.unit_price}
                            onChange={(e) => handleUpdateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div className="col-span-2">
                          <Input
                            value={`€${item.total_price.toFixed(2)}`}
                            disabled
                          />
                        </div>
                        <div className="col-span-1 flex justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveItem(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}

                    {items.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        Προσθέστε items στο τιμολόγιο
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Notes & Terms */}
              <Card>
                <CardHeader>
                  <CardTitle>Σημειώσεις & Όροι</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Σημειώσεις</Label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      placeholder="Προσθέστε σημειώσεις για τον πελάτη..."
                    />
                  </div>

                  <div>
                    <Label>Όροι Πληρωμής</Label>
                    <Textarea
                      value={paymentTerms}
                      onChange={(e) => setPaymentTerms(e.target.value)}
                      rows={2}
                      placeholder="π.χ. Payment due within 30 days"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Summary Sidebar */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Σύνοψη</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span className="font-medium">€{subtotal.toFixed(2)}</span>
                  </div>

                  <div>
                    <Label>Έκπτωση (€)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={discountAmount}
                      onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                    />
                  </div>

                  {discountAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Μετά την έκπτωση:</span>
                      <span>€{(subtotal - discountAmount).toFixed(2)}</span>
                    </div>
                  )}

                  <div>
                    <Label>Φόρος (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={taxRate}
                      onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                    />
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Ποσό Φόρου:</span>
                    <span>€{taxAmount.toFixed(2)}</span>
                  </div>

                  <div className="pt-4 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold">ΣΥΝΟΛΟ:</span>
                      <span className="text-2xl font-bold">€{total.toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Packages Dialog */}
          <Dialog open={showPackagesDialog} onOpenChange={setShowPackagesDialog}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Επιλογή Πακέτου</DialogTitle>
                <DialogDescription>
                  Επιλέξτε ένα πακέτο για να το προσθέσετε στο τιμολόγιο
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {packages.map(pkg => (
                  <Card
                    key={pkg.id}
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => handleAddPackage(pkg)}
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{pkg.name}</CardTitle>
                        <Badge>€{parseFloat(String(pkg.price)).toFixed(2)}</Badge>
                      </div>
                      <CardDescription>{pkg.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <p>Duration: {pkg.duration_months} month(s)</p>
                        <p>Sessions: {pkg.sessions_included}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </SidebarProvider>
  );
}