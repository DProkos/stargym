import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppSidebarAdmin } from "@/components/app-sidebar-admin";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Search, TrendingUp, Activity, UsersRound, Download, FileSpreadsheet, Plus } from "lucide-react";
import { MemberRow } from "@/components/MemberRow";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface Member {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  created_at: string;
  roles?: string[];
}
export default function UserManagement() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCustomers: 0,
    activeCustomers: 0,
    totalLifetimeValue: 0,
    avgBookingsPerCustomer: 0
  });
  const [members, setMembers] = useState<Member[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
  const [filteredStaff, setFilteredStaff] = useState<Member[]>([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [staffSearchQuery, setStaffSearchQuery] = useState("");
  const navigate = useNavigate();
  useEffect(() => {
    checkAuth();
  }, []);
  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin]);
  // Filter staff (admins and trainers)
  const staffUsers = members.filter(member => 
    member.roles?.includes('admin') || member.roles?.includes('trainer')
  );

  // Filter members only (those with member role but NOT admin or trainer)
  const memberUsers = members.filter(member => 
    member.roles?.includes('member') && !member.roles?.includes('admin') && !member.roles?.includes('trainer')
  );

  // Filter staff based on search
  useEffect(() => {
    let filtered = staffUsers;
    if (staffSearchQuery) {
      filtered = filtered.filter(member => 
        member.email.toLowerCase().includes(staffSearchQuery.toLowerCase()) || 
        member.full_name?.toLowerCase().includes(staffSearchQuery.toLowerCase())
      );
    }
    setFilteredStaff(filtered);
  }, [staffSearchQuery, members]);

  // Filter members based on search
  useEffect(() => {
    let filtered = memberUsers;
    if (memberSearchQuery) {
      filtered = filtered.filter(member => 
        member.email.toLowerCase().includes(memberSearchQuery.toLowerCase()) || 
        member.full_name?.toLowerCase().includes(memberSearchQuery.toLowerCase())
      );
    }
    setFilteredMembers(filtered);
  }, [memberSearchQuery, members]);
  const checkAuth = async () => {
    const {
      data: {
        session
      }
    } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    const {
      data: roles
    } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id);
    const hasAdminRole = roles?.some(r => r.role === "admin");
    if (!hasAdminRole) {
      navigate("/");
      return;
    }
    setIsAdmin(true);
    setLoading(false);
  };
  const loadData = async () => {
    await Promise.all([loadStats(), loadMembers()]);
  };
  const loadMembers = async () => {
    // First, get all profiles
    const {
      data: profiles,
      error: profilesError
    } = await supabase.from("profiles").select("*").order("created_at", {
      ascending: false
    });
    if (profilesError) {
      console.error("Failed to load members:", profilesError);
      toast.error("Failed to load members");
      return;
    }

    // Then, get all user roles
    const {
      data: userRoles,
      error: rolesError
    } = await supabase.from("user_roles").select("user_id, role");
    if (rolesError) {
      console.error("Failed to load roles:", rolesError);
    }

    // Combine profiles with their roles
    const membersWithRoles = profiles?.map(profile => ({
      ...profile,
      roles: userRoles?.filter(r => r.user_id === profile.id).map(r => r.role) || []
    })) || [];
    setMembers(membersWithRoles);
  };
  const loadStats = async () => {
    const {
      data: profiles
    } = await supabase.from("profiles").select("customer_status, lifetime_value, total_bookings");
    if (profiles) {
      const totalCustomers = profiles.length;
      const activeCustomers = profiles.filter(p => p.customer_status === "active").length;
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
    const headers = ["Email", "Full Name", "Phone", "Roles", "Created At"];
    const rows = filteredMembers.map(member => [member.email, member.full_name || "N/A", member.phone || "N/A", member.roles?.join(", ") || "No roles", new Date(member.created_at).toLocaleDateString()]);
    const csvContent = [headers.join(","), ...rows.map(row => row.map(cell => `"${cell}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;"
    });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `members_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${filteredMembers.length} members to CSV`);
  };
  const exportToExcel = () => {
    const headers = ["Email", "Full Name", "Phone", "Roles", "Created At"];
    const rows = filteredMembers.map(member => [member.email, member.full_name || "N/A", member.phone || "N/A", member.roles?.join(", ") || "No roles", new Date(member.created_at).toLocaleDateString()]);
    let htmlContent = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">';
    htmlContent += '<head><meta charset="utf-8"/></head><body>';
    htmlContent += '<table border="1">';
    htmlContent += "<thead><tr>" + headers.map(h => `<th>${h}</th>`).join("") + "</tr></thead>";
    htmlContent += "<tbody>";
    rows.forEach(row => {
      htmlContent += "<tr>" + row.map(cell => `<td>${cell}</td>`).join("") + "</tr>";
    });
    htmlContent += "</tbody></table></body></html>";
    const blob = new Blob([htmlContent], {
      type: "application/vnd.ms-excel"
    });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `members_${new Date().toISOString().split("T")[0]}.xls`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${filteredMembers.length} members to Excel`);
  };
  if (loading || !isAdmin) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }
  return <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebarAdmin />
        <main className="flex-1 p-6 overflow-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">Διαχείριση Χρηστών</h1>
            <p className="text-muted-foreground">Διαχειριστείτε τους χρήστες και τα δικαιώματά τους</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Συνολικοί Χρηστες</CardTitle>
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
                <CardTitle className="text-sm font-medium text-muted-foreground">Μέλη</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold">{memberUsers.length}</div>
                  <Activity className="h-8 w-8 text-green-500/50" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Lifetime Value</CardTitle>
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
                <CardTitle className="text-sm font-medium text-muted-foreground">Μ.Ο. Κρατήσεις/Πελάτη</CardTitle>
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
                Χρήστες
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
                      <CardTitle>Χρήστες Προγράμματος ({filteredStaff.length})</CardTitle>
                      <CardDescription>Διαχειριστές και Εκπαιδευτές</CardDescription>
                    </div>
                    <Button onClick={() => navigate("/admin/crm/customer/new")}>
                      <Plus className="h-4 w-4 mr-2" />
                      Νέος Χρήστης
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4 mb-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Αναζήτηση χρηστών..." value={staffSearchQuery} onChange={e => setStaffSearchQuery(e.target.value)} className="pl-10" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    {filteredStaff.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        {staffSearchQuery ? "Δεν βρέθηκαν χρήστες" : "Δεν υπάρχουν χρήστες"}
                      </div>
                    ) : (
                      filteredStaff.map(member => (
                        <MemberRow key={member.id} member={member} onRoleUpdate={loadMembers} />
                      ))
                    )}
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
                      <CardDescription>Manage member roles and permissions</CardDescription>
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
                  <div className="mb-4 space-y-4">
                    <div className="flex gap-4">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Αναζήτηση μελών (email, όνομα)..." value={memberSearchQuery} onChange={e => setMemberSearchQuery(e.target.value)} className="pl-10" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>
                        Αποτελέσματα: {filteredMembers.length} από {memberUsers.length} μέλη
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {filteredMembers.length === 0 ? <div className="text-center py-8 text-muted-foreground">
                        {memberSearchQuery ? "Δεν βρέθηκαν μέλη" : "Δεν υπάρχουν μέλη"}
                      </div> : filteredMembers.map(member => <MemberRow key={member.id} member={member} onRoleUpdate={loadMembers} />)}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </SidebarProvider>;
}