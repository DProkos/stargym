import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebarAdmin } from '@/components/app-sidebar-admin';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ArrowLeft, UserCircle, Shield, Mail, Phone, Calendar } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  created_at: string;
}

interface UserRole {
  id: string;
  role: string;
  created_at: string;
}

export default function UserProfile() {
  const navigate = useNavigate();
  const { userId } = useParams();
  const [isAdmin, setIsAdmin] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    loadUserData();
  }, [userId]);

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

  const loadUserData = async () => {
    if (!userId) return;

    setLoading(true);

    // Load profile
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Failed to load profile:', profileError);
      toast.error('Failed to load user profile');
      setLoading(false);
      return;
    }

    setProfile(profileData);

    // Load all roles for this user
    const { data: rolesData, error: rolesError } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (rolesError) {
      console.error('Failed to load roles:', rolesError);
      toast.error('Failed to load user roles');
    } else {
      setRoles(rolesData || []);
    }

    setLoading(false);
  };

  const handleAddRole = async (newRole: string) => {
    if (!userId) return;

    // Check if role already exists
    if (roles.some(r => r.role === newRole)) {
      toast.error('User already has this role');
      return;
    }

    // Get current admin info
    const { data: { session } } = await supabase.auth.getSession();
    const adminEmail = session?.user?.email || 'Unknown';

    const { error } = await supabase
      .from('user_roles')
      .insert({ 
        user_id: userId, 
        role: newRole as 'admin' | 'trainer' | 'member'
      });

    if (error) {
      console.error('Failed to add role:', error);
      toast.error('Failed to add role');
      return;
    }

    // Log activity
    await supabase.from('admin_activity_log').insert({
      admin_id: session?.user?.id,
      action_type: 'role_added',
      target_user_id: userId,
      details: {
        role: newRole,
        user_email: profile?.email,
        admin_email: adminEmail
      }
    });

    toast.success(`Role "${newRole}" added successfully`);
    loadUserData();
  };

  const handleRemoveRole = async (roleId: string, roleName: string) => {
    if (!confirm(`Are you sure you want to remove the "${roleName}" role?`)) {
      return;
    }

    // Get current admin info
    const { data: { session } } = await supabase.auth.getSession();
    const adminEmail = session?.user?.email || 'Unknown';

    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('id', roleId);

    if (error) {
      console.error('Failed to remove role:', error);
      toast.error('Failed to remove role');
      return;
    }

    // Log activity
    await supabase.from('admin_activity_log').insert({
      admin_id: session?.user?.id,
      action_type: 'role_removed',
      target_user_id: userId,
      details: {
        role: roleName,
        user_email: profile?.email,
        admin_email: adminEmail
      }
    });

    toast.success(`Role "${roleName}" removed successfully`);
    loadUserData();
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-500/20 text-red-300 hover:bg-red-500/30';
      case 'trainer':
        return 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30';
      case 'member':
        return 'bg-green-500/20 text-green-300 hover:bg-green-500/30';
      default:
        return 'bg-gray-500/20 text-gray-300 hover:bg-gray-500/30';
    }
  };

  const getRolePermissions = (role: string) => {
    switch (role) {
      case 'admin':
        return [
          'Full system access',
          'Manage all users',
          'Manage classes and bookings',
          'Configure settings',
          'Send newsletters',
          'View analytics'
        ];
      case 'trainer':
        return [
          'View assigned classes',
          'View class bookings',
          'Update own profile',
          'Access trainer portal'
        ];
      case 'member':
        return [
          'Book classes',
          'View own bookings',
          'Update own profile',
          'Access customer portal'
        ];
      default:
        return [];
    }
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

  if (!profile) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebarAdmin />
          <main className="flex-1 p-6">
            <Button variant="ghost" onClick={() => navigate('/admin')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Admin
            </Button>
            <p className="mt-4">User not found</p>
          </main>
        </div>
      </SidebarProvider>
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
              <h1 className="text-2xl font-bold ml-4">User Profile</h1>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* User Info Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCircle className="h-5 w-5" />
                  User Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{profile.email}</p>
                    </div>
                  </div>
                  
                  {profile.full_name && (
                    <div className="flex items-center gap-2">
                      <UserCircle className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Full Name</p>
                        <p className="font-medium">{profile.full_name}</p>
                      </div>
                    </div>
                  )}
                  
                  {profile.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Phone</p>
                        <p className="font-medium">{profile.phone}</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Member Since</p>
                      <p className="font-medium">
                        {new Date(profile.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Roles Management Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Roles & Permissions
                    </CardTitle>
                    <CardDescription>
                      Manage user roles and view associated permissions
                    </CardDescription>
                  </div>
                  <Select onValueChange={handleAddRole}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Add role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="trainer">Trainer</SelectItem>
                      <SelectItem value="member">Member</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {roles.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No roles assigned
                  </p>
                ) : (
                  <div className="space-y-4">
                    {roles.map((roleItem) => (
                      <div key={roleItem.id} className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Badge className={getRoleBadgeColor(roleItem.role)}>
                              {roleItem.role}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              Added {new Date(roleItem.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveRole(roleItem.id, roleItem.role)}
                          >
                            Remove
                          </Button>
                        </div>
                        
                        <div className="ml-2 pl-4 border-l-2 border-muted">
                          <p className="text-sm font-medium mb-2">Permissions:</p>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            {getRolePermissions(roleItem.role).map((permission, idx) => (
                              <li key={idx} className="flex items-center gap-2">
                                <span className="text-primary">•</span>
                                {permission}
                              </li>
                            ))}
                          </ul>
                        </div>
                        
                        {roleItem !== roles[roles.length - 1] && (
                          <Separator className="mt-4" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
