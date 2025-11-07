import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebarAdmin } from '@/components/app-sidebar-admin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MemberRow } from '@/components/MemberRow';
import { Users, Search, Download, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Member {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  created_at: string;
}

export default function Members() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    loadMembers();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      const filtered = members.filter(
        (member) =>
          member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          member.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredMembers(filtered);
    } else {
      setFilteredMembers(members);
    }
  }, [searchQuery, members]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/auth');
      return;
    }

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id);

    const hasAdminRole = roleData?.some(r => r.role === 'admin');
    if (!hasAdminRole) {
      navigate('/');
      return;
    }

    setIsAdmin(true);
  };

  const loadMembers = async () => {
    setLoading(true);

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

    setLoading(false);
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

  if (!isAdmin || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebarAdmin />
        <main className="flex-1">
          <div className="border-b">
            <div className="flex h-16 items-center px-6 justify-between">
              <div className="flex items-center">
                <SidebarTrigger />
                <h1 className="text-2xl font-bold ml-4">Members Management</h1>
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
          </div>

          <div className="p-6">
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
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search members..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 w-[300px]"
                      />
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => navigate('/admin/bulk-users')}
                    >
                      Bulk Manage
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {filteredMembers.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      {searchQuery ? 'No members found matching your search' : 'No members yet'}
                    </div>
                  ) : (
                    filteredMembers.map((member) => (
                      <MemberRow key={member.id} member={member} onRoleUpdate={loadMembers} />
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
