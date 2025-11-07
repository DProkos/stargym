import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebarAdmin } from '@/components/app-sidebar-admin';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { ArrowLeft, Users, Shield, Dumbbell, User2, Check, X, Download, FileSpreadsheet, Key, UserX, UserCheck } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface UserWithRoles {
  id: string;
  email: string;
  full_name: string | null;
  roles: string[];
  banned: boolean;
}

type Role = 'admin' | 'trainer' | 'member';

export default function BulkUserManagement() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [selectedRole, setSelectedRole] = useState<Role | ''>('');
  const [action, setAction] = useState<'add' | 'remove' | ''>('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [resetPasswordDialog, setResetPasswordDialog] = useState(false);
  const [selectedUserForReset, setSelectedUserForReset] = useState<UserWithRoles | null>(null);
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    checkAuth();
    loadUsers();
  }, []);

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

  const loadUsers = async () => {
    setLoading(true);

    try {
      // Load all user data including ban status from admin API
      const { data: usersData, error: usersError } = await supabase.functions.invoke('admin-get-users');

      if (usersError) {
        throw usersError;
      }

      // Load all user roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) {
        console.error('Failed to load roles:', rolesError);
        toast.error('Failed to load user roles');
        setLoading(false);
        return;
      }

      // Combine users with their roles
      const usersWithRoles = usersData.users.map((user: any) => ({
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || null,
        banned: user.banned_until !== null && user.banned_until !== undefined,
        roles: rolesData
          ?.filter(r => r.user_id === user.id)
          .map(r => r.role) || []
      }));

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Failed to load users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(new Set(filteredUsers.map(u => u.id)));
    } else {
      setSelectedUsers(new Set());
    }
  };

  const handleSelectUser = (userId: string, checked: boolean) => {
    const newSelected = new Set(selectedUsers);
    if (checked) {
      newSelected.add(userId);
    } else {
      newSelected.delete(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleBulkOperation = async () => {
    if (selectedUsers.size === 0) {
      toast.error('Please select at least one user');
      return;
    }

    if (!selectedRole) {
      toast.error('Please select a role');
      return;
    }

    if (!action) {
      toast.error('Please select an action (add or remove)');
      return;
    }

    const actionText = action === 'add' ? 'add' : 'remove';
    const confirmMessage = `Are you sure you want to ${actionText} the "${selectedRole}" role ${action === 'add' ? 'to' : 'from'} ${selectedUsers.size} user(s)?`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    setProcessing(true);
    setProgress(0);

    const selectedUserIds = Array.from(selectedUsers);
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < selectedUserIds.length; i++) {
      const userId = selectedUserIds[i];
      
      try {
        if (action === 'add') {
          // Check if role already exists
          const { data: existingRole } = await supabase
            .from('user_roles')
            .select('id')
            .eq('user_id', userId)
            .eq('role', selectedRole)
            .single();

          if (!existingRole) {
            const { error } = await supabase
              .from('user_roles')
              .insert({ 
                user_id: userId, 
                role: selectedRole 
              });

            if (error) throw error;
          }
        } else {
          const { error } = await supabase
            .from('user_roles')
            .delete()
            .eq('user_id', userId)
            .eq('role', selectedRole);

          if (error) throw error;
        }

        successCount++;
      } catch (error) {
        console.error(`Failed to ${action} role for user ${userId}:`, error);
        errorCount++;
      }

      setProgress(((i + 1) / selectedUserIds.length) * 100);
    }

    setProcessing(false);
    setProgress(0);
    setSelectedUsers(new Set());
    setSelectedRole('');
    setAction('');

    if (successCount > 0) {
      toast.success(`Successfully ${action === 'add' ? 'added' : 'removed'} role for ${successCount} user(s)`);
    }

    if (errorCount > 0) {
      toast.error(`Failed to update ${errorCount} user(s)`);
    }

    loadUsers();
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-500/20 text-red-300';
      case 'trainer':
        return 'bg-blue-500/20 text-blue-300';
      case 'member':
        return 'bg-green-500/20 text-green-300';
      default:
        return 'bg-gray-500/20 text-gray-300';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield className="h-3 w-3" />;
      case 'trainer':
        return <Dumbbell className="h-3 w-3" />;
      case 'member':
        return <User2 className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  const exportToCSV = () => {
    const headers = ['Email', 'Full Name', 'Roles', 'Number of Roles'];
    const rows = filteredUsers.map(user => [
      user.email,
      user.full_name || 'N/A',
      user.roles.join(', ') || 'No roles',
      user.roles.length.toString()
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `users_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success(`Exported ${filteredUsers.length} users to CSV`);
  };

  const exportToExcel = () => {
    // Create HTML table format that Excel can read
    const headers = ['Email', 'Full Name', 'Roles', 'Number of Roles'];
    const rows = filteredUsers.map(user => [
      user.email,
      user.full_name || 'N/A',
      user.roles.join(', ') || 'No roles',
      user.roles.length.toString()
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
    link.setAttribute('download', `users_export_${new Date().toISOString().split('T')[0]}.xls`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success(`Exported ${filteredUsers.length} users to Excel`);
  };

  const handleResetPassword = async (user: UserWithRoles) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/auth?reset=true`,
      });

      if (error) throw error;

      toast.success(`Password reset email sent to ${user.email}`);
    } catch (error: any) {
      console.error('Failed to send reset email:', error);
      toast.error(`Failed to send reset email: ${error.message}`);
    }
  };

  const handleSetNewPassword = async () => {
    if (!selectedUserForReset || !newPassword) {
      toast.error('Please enter a new password');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    try {
      // Use Supabase admin API through edge function
      const { data, error } = await supabase.functions.invoke('admin-update-user', {
        body: {
          userId: selectedUserForReset.id,
          password: newPassword,
        },
      });

      if (error) throw error;

      toast.success(`Password updated successfully for ${selectedUserForReset.email}`);
      setResetPasswordDialog(false);
      setSelectedUserForReset(null);
      setNewPassword('');
    } catch (error: any) {
      console.error('Failed to update password:', error);
      toast.error(`Failed to update password: ${error.message}`);
    }
  };

  const handleToggleUserStatus = async (user: UserWithRoles) => {
    const action = user.banned ? 'enable' : 'disable';
    const confirmMessage = `Are you sure you want to ${action} ${user.email}?`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      const { error } = await supabase.functions.invoke('admin-toggle-user-status', {
        body: {
          userId: user.id,
          action,
        },
      });

      if (error) throw error;

      toast.success(`User ${action}d successfully`);
      loadUsers();
    } catch (error: any) {
      console.error(`Failed to ${action} user:`, error);
      toast.error(`Failed to ${action} user: ${error.message}`);
    }
  };

  const handleBulkToggleStatus = async (action: 'enable' | 'disable') => {
    if (selectedUsers.size === 0) {
      toast.error('Please select at least one user');
      return;
    }

    const confirmMessage = `Are you sure you want to ${action} ${selectedUsers.size} user(s)?`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    setProcessing(true);
    setProgress(0);

    const selectedUserIds = Array.from(selectedUsers);
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < selectedUserIds.length; i++) {
      const userId = selectedUserIds[i];
      
      try {
        const { error } = await supabase.functions.invoke('admin-toggle-user-status', {
          body: {
            userId,
            action,
          },
        });

        if (error) throw error;
        successCount++;
      } catch (error) {
        console.error(`Failed to ${action} user ${userId}:`, error);
        errorCount++;
      }

      setProgress(((i + 1) / selectedUserIds.length) * 100);
    }

    setProcessing(false);
    setProgress(0);
    setSelectedUsers(new Set());

    if (successCount > 0) {
      toast.success(`Successfully ${action}d ${successCount} user(s)`);
    }

    if (errorCount > 0) {
      toast.error(`Failed to ${action} ${errorCount} user(s)`);
    }

    loadUsers();
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebarAdmin />
        <main className="flex-1">
          <div className="border-b">
            <div className="flex h-16 items-center px-6">
              <SidebarTrigger />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/admin')}
                className="ml-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <h1 className="text-2xl font-bold ml-4">Bulk User Management</h1>
              <div className="ml-auto">
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
          </div>

          <div className="p-6 space-y-6">
            {/* Bulk Actions Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Bulk User Management
                </CardTitle>
                <CardDescription>
                  Manage roles and account status for multiple users
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Role Management Section */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Role Management</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Select Role
                    </label>
                    <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as Role)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="trainer">Trainer</SelectItem>
                        <SelectItem value="member">Member</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Select Action
                    </label>
                    <Select value={action} onValueChange={(value) => setAction(value as 'add' | 'remove')}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose action" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="add">Add Role</SelectItem>
                        <SelectItem value="remove">Remove Role</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-end">
                    <Button 
                      onClick={handleBulkOperation} 
                      disabled={processing || selectedUsers.size === 0 || !selectedRole || !action}
                      className="w-full"
                    >
                      Apply to {selectedUsers.size} User(s)
                    </Button>
                  </div>
                </div>

                {processing && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Processing...</p>
                    <Progress value={progress} className="w-full" />
                  </div>
                )}

                {selectedUsers.size > 0 && (
                  <Alert>
                    <AlertDescription>
                      {selectedUsers.size} user(s) selected
                    </AlertDescription>
                  </Alert>
                )}
              </div>

                {/* Account Status Section */}
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="font-semibold">Account Status</h3>
                  <div className="flex gap-4">
                    <Button 
                      variant="destructive"
                      onClick={() => handleBulkToggleStatus('disable')} 
                      disabled={processing || selectedUsers.size === 0}
                      className="flex-1"
                    >
                      <UserX className="h-4 w-4 mr-2" />
                      Disable {selectedUsers.size > 0 ? `(${selectedUsers.size})` : ''} User(s)
                    </Button>
                    <Button 
                      variant="default"
                      onClick={() => handleBulkToggleStatus('enable')} 
                      disabled={processing || selectedUsers.size === 0}
                      className="flex-1"
                    >
                      <UserCheck className="h-4 w-4 mr-2" />
                      Enable {selectedUsers.size > 0 ? `(${selectedUsers.size})` : ''} User(s)
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* User List Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Select Users</CardTitle>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="px-3 py-2 border border-border rounded-md bg-background text-sm"
                    />
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                      <span className="text-sm">Select All</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {filteredUsers.map((user) => (
                    <div
                      key={user.id}
                      className={`flex items-center justify-between p-3 border border-border rounded-lg hover:bg-secondary/50 transition-colors ${
                        user.banned ? 'opacity-50 bg-destructive/5' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={selectedUsers.has(user.id)}
                          onCheckedChange={(checked) => handleSelectUser(user.id, checked as boolean)}
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{user.full_name || 'No name'}</p>
                            {user.banned && (
                              <Badge variant="destructive" className="text-xs">
                                <UserX className="h-3 w-3 mr-1" />
                                Disabled
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          {user.roles.map((role) => (
                            <Badge
                              key={role}
                              className={`${getRoleBadgeColor(role)} flex items-center gap-1`}
                            >
                              {getRoleIcon(role)}
                              {role}
                            </Badge>
                          ))}
                          {user.roles.length === 0 && (
                            <Badge variant="outline" className="text-muted-foreground">
                              No roles
                            </Badge>
                          )}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Key className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleResetPassword(user)}>
                              Send Reset Email
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => {
                              setSelectedUserForReset(user);
                              setResetPasswordDialog(true);
                            }}>
                              Set New Password
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Button 
                          variant={user.banned ? "default" : "destructive"}
                          size="sm"
                          onClick={() => handleToggleUserStatus(user)}
                        >
                          {user.banned ? (
                            <>
                              <UserCheck className="h-4 w-4 mr-1" />
                              Enable
                            </>
                          ) : (
                            <>
                              <UserX className="h-4 w-4 mr-1" />
                              Disable
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}

                  {filteredUsers.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      No users found
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      <Dialog open={resetPasswordDialog} onOpenChange={setResetPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set New Password</DialogTitle>
            <DialogDescription>
              Set a new password for {selectedUserForReset?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 6 characters)"
                className="bg-secondary border-border"
              />
              <p className="text-xs text-muted-foreground">
                Password must be at least 6 characters long
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setResetPasswordDialog(false);
              setSelectedUserForReset(null);
              setNewPassword('');
            }}>
              Cancel
            </Button>
            <Button onClick={handleSetNewPassword} disabled={!newPassword || newPassword.length < 6}>
              Update Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
