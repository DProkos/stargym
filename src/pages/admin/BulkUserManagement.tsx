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
import { ArrowLeft, Users, Shield, Dumbbell, User2, Check, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';

interface UserWithRoles {
  id: string;
  email: string;
  full_name: string | null;
  roles: string[];
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

    // Load all profiles
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .order('email', { ascending: true });

    if (profilesError) {
      console.error('Failed to load users:', profilesError);
      toast.error('Failed to load users');
      setLoading(false);
      return;
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
    const usersWithRoles = profilesData.map(profile => ({
      ...profile,
      roles: rolesData
        ?.filter(r => r.user_id === profile.id)
        .map(r => r.role) || []
    }));

    setUsers(usersWithRoles);
    setLoading(false);
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
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Bulk Actions Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Bulk Role Management
                </CardTitle>
                <CardDescription>
                  Select multiple users and assign or remove roles in bulk
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
                      className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-secondary/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={selectedUsers.has(user.id)}
                          onCheckedChange={(checked) => handleSelectUser(user.id, checked as boolean)}
                        />
                        <div>
                          <p className="font-medium">{user.full_name || 'No name'}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
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
    </SidebarProvider>
  );
}
