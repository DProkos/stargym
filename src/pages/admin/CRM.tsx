import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AppSidebarAdmin } from '@/components/app-sidebar-admin';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Users, Search, TrendingUp, Activity, UsersRound, Download, FileSpreadsheet, Plus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MemberRow } from '@/components/MemberRow';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface Customer {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  customer_status: string;
  lifetime_value: number;
  total_bookings: number;
  last_booking_date: string;
  created_at: string;
  tags?: { id: string; name: string; color: string }[];
}

interface Member {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  created_at: string;
}

export default function CRM() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stats, setStats] = useState({
    totalCustomers: 0,
    activeCustomers: 0,
    totalLifetimeValue: 0,
    avgBookingsPerCustomer: 0
  });
  const [members, setMembers] = useState<Member[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const { toast: showToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin]);

  useEffect(() => {
    if (memberSearchQuery) {
      const filtered = members.filter(
        (member) =>
          member.email.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
          member.full_name?.toLowerCase().includes(memberSearchQuery.toLowerCase())
      );
      setFilteredMembers(filtered);
    } else {
      setFilteredMembers(members);
    }
  }, [memberSearchQuery, members]);

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

  const loadData = async () => {
    await Promise.all([
      loadCustomers(),
      loadStats(),
      loadMembers()
    ]);
  };

  const loadMembers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to load members:', error);
      toast.error('Failed to load members');
    } else {
      setMembers(data || []);
      setFilteredMembers(data || []);
    }
  };

  const loadCustomers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        *,
        customer_tag_assignments!customer_tag_assignments_customer_id_fkey (
          customer_tags (
            id,
            name,
            color
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      showToast({ title: 'Error loading customers', variant: 'destructive' });
      return;
    }

    const customersWithTags = data.map(customer => ({
      ...customer,
      tags: customer.customer_tag_assignments?.map((ta: any) => ta.customer_tags).filter(Boolean) || []
    }));

    setCustomers(customersWithTags);
  };

  const loadStats = async () => {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('customer_status, lifetime_value, total_bookings');

    if (profiles) {
      const totalCustomers = profiles.length;
      const activeCustomers = profiles.filter(p => p.customer_status === 'active').length;
      const totalLifetimeValue = profiles.reduce((sum, p) => sum + (p.lifetime_value || 0), 0);
      const avgBookingsPerCustomer = profiles.reduce((sum, p) => sum + (p.total_bookings || 0), 0) / totalCustomers || 0;

      setStats({
        totalCustomers,
        activeCustomers,
        totalLifetimeValue,
        avgBookingsPerCustomer
      });
    }
  };

  const exportToCSV = () => {
    const headers = ['Email', 'Full Name', 'Phone', 'Created At'];
    const rows = filteredMembers.map(member => [
      member.email,
      member.full_name || 'N/A',
      member.phone || 'N/A',
      new Date(member.created_at).toLocaleDateString()
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `members_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success(`Exported ${filteredMembers.length} members to CSV`);
  };

  const exportToExcel = () => {
    const headers = ['Email', 'Full Name', 'Phone', 'Created At'];
    const rows = filteredMembers.map(member => [
      member.email,
      member.full_name || 'N/A',
      member.phone || 'N/A',
      new Date(member.created_at).toLocaleDateString()
    ]);

    let htmlContent = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">';
    htmlContent += '<head><meta charset="utf-8"/></head><body>';
    htmlContent += '<table border="1">';
    htmlContent += '<thead><tr>' + headers.map(h => `<th>${h}</th>`).join('') + '</tr></thead>';
    htmlContent += '<tbody>';
    rows.forEach(row => {
      htmlContent += '<tr>' + row.map(cell => `<td>${cell}</td>`).join('') + '</tr>';
    });
    htmlContent += '</tbody></table></body></html>';

    const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `members_${new Date().toISOString().split('T')[0]}.xls`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success(`Exported ${filteredMembers.length} members to Excel`);
  };

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = customer.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         customer.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || customer.customer_status === statusFilter;
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
            <h1 className="text-3xl font-bold mb-2">CRM & Customer Management</h1>
            <p className="text-muted-foreground">
              Διαχειριστείτε πελάτες, segments, και automated workflows
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Συνολικοί Πελάτες
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold">{stats.totalCustomers}</div>
                  <Users className="h-8 w-8 text-primary/50" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Ενεργοί Πελάτες
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold">{stats.activeCustomers}</div>
                  <Activity className="h-8 w-8 text-green-500/50" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Lifetime Value
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold">€{stats.totalLifetimeValue.toFixed(2)}</div>
                  <TrendingUp className="h-8 w-8 text-green-500/50" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Μ.Ο. Κρατήσεις/Πελάτη
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold">{stats.avgBookingsPerCustomer.toFixed(1)}</div>
                  <Activity className="h-8 w-8 text-primary/50" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="customers" className="space-y-4">
            <TabsList>
              <TabsTrigger value="customers">
                <Users className="h-4 w-4 mr-2" />
                Πελάτες
              </TabsTrigger>
              <TabsTrigger value="members">
                <UsersRound className="h-4 w-4 mr-2" />
                Members
              </TabsTrigger>
            </TabsList>

            <TabsContent value="customers" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Πελάτες</CardTitle>
                      <CardDescription>
                        Διαχειριστείτε και παρακολουθήστε τους πελάτες σας
                      </CardDescription>
                    </div>
                    <Button onClick={() => navigate('/admin/crm/customer/new')}>
                      <Plus className="h-4 w-4 mr-2" />
                      Νέος Πελάτης
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4 mb-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Αναζήτηση πελατών..."
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
                        <SelectItem value="all">Όλοι</SelectItem>
                        <SelectItem value="active">Ενεργοί</SelectItem>
                        <SelectItem value="inactive">Ανενεργοί</SelectItem>
                        <SelectItem value="lead">Leads</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    {filteredCustomers.map((customer) => (
                      <div
                        key={customer.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent cursor-pointer"
                        onClick={() => navigate(`/admin/crm/customer/${customer.id}`)}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{customer.full_name || 'No Name'}</span>
                            <Badge variant={customer.customer_status === 'active' ? 'default' : 'secondary'}>
                              {customer.customer_status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{customer.email}</p>
                          <div className="flex gap-2 mt-2">
                            {customer.tags?.map(tag => (
                              <Badge
                                key={tag.id}
                                style={{ backgroundColor: tag.color }}
                                className="text-white"
                              >
                                {tag.name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">€{customer.lifetime_value?.toFixed(2) || '0.00'}</p>
                          <p className="text-xs text-muted-foreground">{customer.total_bookings || 0} κρατήσεις</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="members" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        All Members ({filteredMembers.length})
                      </CardTitle>
                      <CardDescription>
                        Manage member roles and permissions
                      </CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-2" />
                          Export
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={exportToCSV}>
                          <FileSpreadsheet className="h-4 w-4 mr-2" />
                          Export as CSV
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={exportToExcel}>
                          <FileSpreadsheet className="h-4 w-4 mr-2" />
                          Export as Excel
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search members..."
                        value={memberSearchQuery}
                        onChange={(e) => setMemberSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    {filteredMembers.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        {memberSearchQuery ? 'No members found matching your search' : 'No members yet'}
                      </div>
                    ) : (
                      filteredMembers.map((member) => (
                        <MemberRow key={member.id} member={member} onRoleUpdate={loadMembers} />
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </SidebarProvider>
  );
}