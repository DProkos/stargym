import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AppSidebarAdmin } from '@/components/app-sidebar-admin';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { FileText, Plus, Search, Download, Eye, DollarSign, Calendar } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Invoice {
  id: string;
  invoice_number: string;
  customer_id: string;
  issue_date: string;
  due_date: string;
  status: string;
  total_amount: number;
  profiles: {
    full_name: string;
    email: string;
  };
}

export default function Invoices() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stats, setStats] = useState({
    totalInvoices: 0,
    totalRevenue: 0,
    paidInvoices: 0,
    pendingAmount: 0
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadInvoices();
      loadStats();
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

  const loadInvoices = async () => {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        profiles:customer_id (
          full_name,
          email
        )
      `)
      .order('issue_date', { ascending: false });

    if (error) {
      toast({ title: 'Error loading invoices', variant: 'destructive' });
      return;
    }

    setInvoices(data || []);
  };

  const loadStats = async () => {
    const { data: invoices } = await supabase
      .from('invoices')
      .select('status, total_amount');

    if (invoices) {
      const totalInvoices = invoices.length;
      const totalRevenue = invoices
        .filter(i => i.status === 'paid')
        .reduce((sum, i) => sum + parseFloat(String(i.total_amount)), 0);
      const paidInvoices = invoices.filter(i => i.status === 'paid').length;
      const pendingAmount = invoices
        .filter(i => i.status === 'sent' || i.status === 'overdue')
        .reduce((sum, i) => sum + parseFloat(String(i.total_amount)), 0);

      setStats({
        totalInvoices,
        totalRevenue,
        paidInvoices,
        pendingAmount
      });
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'paid': return 'default';
      case 'sent': return 'secondary';
      case 'overdue': return 'destructive';
      case 'draft': return 'outline';
      case 'cancelled': return 'secondary';
      default: return 'default';
    }
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = 
      invoice.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.profiles?.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading || !isAdmin) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebarAdmin />
        <main className="flex-1 p-6 overflow-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">Τιμολόγηση & Πακέτα</h1>
            <p className="text-muted-foreground">
              Διαχειριστείτε τιμολόγια, πακέτα υπηρεσιών και ρυθμίσεις PDF
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Συνολικά Τιμολόγια
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold">{stats.totalInvoices}</div>
                  <FileText className="h-8 w-8 text-primary/50" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Συνολικά Έσοδα
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold">€{stats.totalRevenue.toFixed(2)}</div>
                  <DollarSign className="h-8 w-8 text-green-500/50" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Πληρωμένα
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold">{stats.paidInvoices}</div>
                  <Calendar className="h-8 w-8 text-green-500/50" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Εκκρεμή Ποσά
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold">€{stats.pendingAmount.toFixed(2)}</div>
                  <DollarSign className="h-8 w-8 text-orange-500/50" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2 mb-6">
            <Button onClick={() => navigate('/admin/invoices/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Νέο Τιμολόγιο
            </Button>
            <Button variant="outline" onClick={() => navigate('/admin/packages')}>
              <FileText className="h-4 w-4 mr-2" />
              Πακέτα Υπηρεσιών
            </Button>
            <Button variant="outline" onClick={() => navigate('/admin/invoice-settings')}>
              Ρυθμίσεις PDF
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Τιμολόγια</CardTitle>
              <CardDescription>
                Διαχειριστείτε και παρακολουθήστε όλα τα τιμολόγια
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Αναζήτηση τιμολογίων..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Φίλτρο Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Όλα</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                {filteredInvoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent cursor-pointer"
                    onClick={() => navigate(`/admin/invoices/${invoice.id}`)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{invoice.invoice_number}</span>
                        <Badge variant={getStatusBadgeVariant(invoice.status)}>
                          {invoice.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {invoice.profiles?.full_name} • {invoice.profiles?.email}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Issue: {new Date(invoice.issue_date).toLocaleDateString()} • 
                        Due: {new Date(invoice.due_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right mr-4">
                        <p className="text-lg font-bold">€{parseFloat(String(invoice.total_amount)).toFixed(2)}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/admin/invoices/${invoice.id}`);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          // PDF download will be handled in detail page
                          navigate(`/admin/invoices/${invoice.id}?download=true`);
                        }}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </SidebarProvider>
  );
}