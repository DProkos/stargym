import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Shield, Dumbbell, User2, Settings, Eye, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface MemberRowProps {
  member: {
    id: string;
    full_name: string | null;
    email: string;
    roles?: string[];
  };
  onRoleUpdate: () => void;
}

type Role = 'admin' | 'trainer' | 'member';

export function MemberRow({ member, onRoleUpdate }: MemberRowProps) {
  const navigate = useNavigate();
  const [roles, setRoles] = useState<Role[]>(member.roles as Role[] || []);
  const [loading, setLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (member.roles) {
      setRoles(member.roles as Role[]);
    } else {
      loadRoles();
    }
  }, [member.id, member.roles]);

  const loadRoles = async () => {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', member.id);

    if (data) {
      setRoles(data.map((r) => r.role as Role));
    }
  };

  const getRoleIcon = (role: Role) => {
    switch (role) {
      case 'admin':
        return <Shield className="h-3 w-3" />;
      case 'trainer':
        return <Dumbbell className="h-3 w-3" />;
      case 'member':
        return <User2 className="h-3 w-3" />;
    }
  };

  const getRoleBadgeColor = (role: Role) => {
    switch (role) {
      case 'admin':
        return 'bg-red-500/20 text-red-500 border-red-500/30';
      case 'trainer':
        return 'bg-blue-500/20 text-blue-500 border-blue-500/30';
      case 'member':
        return 'bg-green-500/20 text-green-500 border-green-500/30';
    }
  };

  const handleRoleToggle = async (role: Role, checked: boolean) => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const adminEmail = session?.user?.email || 'Unknown';

      if (checked) {
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: member.id, role });

        if (error) throw error;

        await supabase.from('admin_activity_log').insert({
          admin_id: session?.user?.id,
          action_type: 'role_added',
          target_user_id: member.id,
          details: {
            role,
            user_email: member.email,
            admin_email: adminEmail
          }
        });

        toast.success(`Added ${role} role to ${member.full_name || member.email}`);
      } else {
        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', member.id)
          .eq('role', role);

        if (error) throw error;

        await supabase.from('admin_activity_log').insert({
          admin_id: session?.user?.id,
          action_type: 'role_removed',
          target_user_id: member.id,
          details: {
            role,
            user_email: member.email,
            admin_email: adminEmail
          }
        });

        toast.success(`Removed ${role} role from ${member.full_name || member.email}`);
      }

      await loadRoles();
      onRoleUpdate();
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast.error(error.message || 'Failed to update role');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    setDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Not authenticated');
        return;
      }

      // Check if trying to delete self
      if (member.id === session.user.id) {
        toast.error('Δεν μπορείτε να διαγράψετε τον εαυτό σας');
        return;
      }

      const { data, error } = await supabase.functions.invoke('admin-delete-user', {
        body: { userId: member.id }
      });

      if (error) throw error;

      toast.success(`Ο χρήστης ${member.full_name || member.email} διαγράφηκε επιτυχώς`);
      onRoleUpdate();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error(error.message || 'Αποτυχία διαγραφής χρήστη');
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between p-4 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors">
        <div className="flex-1">
          <p className="font-semibold">{member.full_name || 'No name'}</p>
          <p className="text-sm text-muted-foreground">{member.email}</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {roles.map((role) => (
              <Badge
                key={role}
                variant="outline"
                className={`${getRoleBadgeColor(role)} flex items-center gap-1`}
              >
                {getRoleIcon(role)}
                {role}
              </Badge>
            ))}
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/admin/users/${member.id}`)}
          >
            <Eye className="h-4 w-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" disabled={loading}>
                <Settings className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-card border-border z-50">
              <DropdownMenuLabel>Manage Roles</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={roles.includes('admin')}
                onCheckedChange={(checked) => handleRoleToggle('admin', checked)}
              >
                <Shield className="h-4 w-4 mr-2" />
                Admin
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={roles.includes('trainer')}
                onCheckedChange={(checked) => handleRoleToggle('trainer', checked)}
              >
                <Dumbbell className="h-4 w-4 mr-2" />
                Trainer
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={roles.includes('member')}
                onCheckedChange={(checked) => handleRoleToggle('member', checked)}
              >
                <User2 className="h-4 w-4 mr-2" />
                Member
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Διαγραφή Χρήστη
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Διαγραφή Χρήστη</AlertDialogTitle>
            <AlertDialogDescription>
              Είστε σίγουροι ότι θέλετε να διαγράψετε τον χρήστη{' '}
              <strong>{member.full_name || member.email}</strong>;
              <br /><br />
              Αυτή η ενέργεια είναι μη αναστρέψιμη και θα διαγράψει όλα τα δεδομένα του χρήστη.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Ακύρωση</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Διαγραφή...' : 'Διαγραφή'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
