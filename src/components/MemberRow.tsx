import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Shield, Dumbbell, User2, Settings, Eye, Trash2, Mail, Key, Loader2, KeyRound, Link2 } from 'lucide-react';
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
  const [sendingWelcome, setSendingWelcome] = useState(false);
  const [sendingResetLink, setSendingResetLink] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (member.roles) {
      setRoles(member.roles as Role[]);
    } else {
      loadRoles();
    }
  }, [member.id, member.roles]);

  const requireAdmin = async (): Promise<boolean> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      toast.error('Πρέπει να συνδεθείτε ως διαχειριστής');
      return false;
    }

    const { data: adminRole, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (error) {
      console.error('Error checking admin role:', error);
      toast.error('Αποτυχία ελέγχου δικαιωμάτων');
      return false;
    }

    if (!adminRole) {
      toast.error('Δεν έχετε δικαιώματα διαχειριστή');
      return false;
    }

    return true;
  };

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

  const handleSendWelcomeEmail = async () => {
    setSendingWelcome(true);
    try {
      const { error } = await supabase.functions.invoke('send-email', {
        body: {
          to: member.email,
          subject: 'Καλωσόρισμα στο γυμναστήριό μας!',
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #6366f1;">Καλωσόρισμα!</h1>
              <p>Αγαπητέ/ή ${member.full_name || 'χρήστη'},</p>
              <p>Καλώς ήρθατε στην οικογένεια του γυμναστηρίου μας!</p>
              <p>Είμαστε ενθουσιασμένοι που σας έχουμε μαζί μας.</p>
              <p>Μπορείτε να συνδεθείτε στην πλατφόρμα μας για να:</p>
              <ul>
                <li>Κάνετε κρατήσεις σε μαθήματα</li>
                <li>Δείτε το πρόγραμμα</li>
                <li>Διαχειριστείτε τη συνδρομή σας</li>
              </ul>
              <br>
              <p>Με εκτίμηση,<br>Η ομάδα του γυμναστηρίου</p>
            </div>
          `,
          text: `Καλωσόρισμα ${member.full_name || 'χρήστη'}! Καλώς ήρθατε στην οικογένεια του γυμναστηρίου μας!`
        }
      });

      if (error) throw error;
      toast.success(`Το Welcome email στάλθηκε στο ${member.email}`);
    } catch (error: any) {
      console.error('Error sending welcome email:', error);
      toast.error('Αποτυχία αποστολής email');
    } finally {
      setSendingWelcome(false);
    }
  };

  const handleSendResetLink = async () => {
    const ok = await requireAdmin();
    if (!ok) return;

    setSendingResetLink(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-reset-password', {
        body: {
          userId: member.id,
          action: 'send_reset_link'
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      toast.success(`Ο σύνδεσμος επαναφοράς στάλθηκε στο ${member.email}`);
    } catch (error: any) {
      console.error('Error sending reset link:', error);
      toast.error(error.message || 'Αποτυχία αποστολής συνδέσμου');
    } finally {
      setSendingResetLink(false);
    }
  };

  const handleManualPasswordChange = async () => {
    const ok = await requireAdmin();
    if (!ok) return;

    if (!newPassword || newPassword.length < 6) {
      toast.error('Ο κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες');
      return;
    }

    setChangingPassword(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-reset-password', {
        body: {
          userId: member.id,
          action: 'manual',
          newPassword: newPassword
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      toast.success(`Ο κωδικός άλλαξε επιτυχώς για ${member.full_name || member.email}`);
      setPasswordDialogOpen(false);
      setNewPassword('');
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast.error(error.message || 'Αποτυχία αλλαγής κωδικού');
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between p-4 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors">
        <div 
          className="flex-1 cursor-pointer"
          onClick={() => navigate(`/admin/crm/customer/${member.id}`)}
        >
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
            onClick={handleSendWelcomeEmail}
            disabled={sendingWelcome}
            title="Αποστολή Welcome Email"
          >
            {sendingWelcome ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleSendResetLink}
            disabled={sendingResetLink}
            title="Αποστολή Link Επαναφοράς (10 λεπτά)"
          >
            {sendingResetLink ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setPasswordDialogOpen(true)}
            title="Χειροκίνητη Αλλαγή Κωδικού"
          >
            <KeyRound className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/admin/crm/customer/${member.id}`)}
            title="Προβολή Λεπτομερειών"
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

      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Αλλαγή Κωδικού</DialogTitle>
            <DialogDescription>
              Ορίστε νέο κωδικό για τον χρήστη {member.full_name || member.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">Νέος Κωδικός</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Εισάγετε νέο κωδικό (min. 6 χαρακτήρες)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordDialogOpen(false)}>
              Ακύρωση
            </Button>
            <Button onClick={handleManualPasswordChange} disabled={changingPassword}>
              {changingPassword ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Αποθήκευση...
                </>
              ) : (
                'Αποθήκευση'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
