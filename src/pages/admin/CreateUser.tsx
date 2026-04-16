import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AppSidebarAdmin } from '@/components/app-sidebar-admin';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, UserPlus, Eye, EyeOff } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

export default function CreateUser() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [roles, setRoles] = useState<string[]>(['member']);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleCreateUser = async () => {
    if (!email || !password) {
      toast({ title: 'Παρακαλώ συμπληρώστε email και κωδικό', variant: 'destructive' });
      return;
    }

    if (!email.includes('@')) {
      toast({ title: 'Παρακαλώ εισάγετε έγκυρο email', variant: 'destructive' });
      return;
    }

    if (password.length < 6) {
      toast({ title: 'Ο κωδικός πρέπει να είναι τουλάχιστον 6 χαρακτήρες', variant: 'destructive' });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: { email, password, fullName, phone, roles }
      });

      if (error) {
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      // Log activity
      const { data: { session } } = await supabase.auth.getSession();
      await supabase.from('admin_activity_log').insert({
        admin_id: session?.user?.id,
        action_type: 'user_created',
        target_user_id: data.userId,
        details: { email, roles, full_name: fullName }
      });

      toast({ title: 'Ο χρήστης δημιουργήθηκε επιτυχώς' });
      navigate('/admin/crm');
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({ 
        title: 'Σφάλμα δημιουργίας χρήστη', 
        description: error.message,
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebarAdmin />
        <main className="flex-1 overflow-auto">
          <header className="h-14 sm:h-16 border-b sticky top-0 bg-background z-30 flex items-center px-3 sm:px-6 gap-2">
            <SidebarTrigger />
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin/crm')}>
              <ArrowLeft className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Πίσω στους Χρήστες</span>
            </Button>
            <h1 className="text-base sm:text-2xl font-bold truncate ml-2">Νέος Χρήστης</h1>
          </header>
          <div className="p-3 sm:p-6">

            <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Δημιουργία Νέου Χρήστη
                </CardTitle>
                <CardDescription>
                  Δημιουργήστε νέο χρήστη ακόμα κι αν η εγγραφή είναι απενεργοποιημένη
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="user@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Κωδικός *</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Τουλάχιστον 6 χαρακτήρες"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Ονοματεπώνυμο</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Όνομα Επώνυμο"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Τηλέφωνο</Label>
                    <Input
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="69xxxxxxxx"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Ρόλοι</Label>
                  <div className="flex flex-wrap gap-4">
                    {[
                      { value: 'member', label: 'Member' },
                      { value: 'trainer', label: 'Trainer' },
                      { value: 'admin', label: 'Admin' }
                    ].map((roleOption) => (
                      <div key={roleOption.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={roleOption.value}
                          checked={roles.includes(roleOption.value)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setRoles([...roles, roleOption.value]);
                            } else {
                              setRoles(roles.filter(r => r !== roleOption.value));
                            }
                          }}
                        />
                        <Label htmlFor={roleOption.value} className="cursor-pointer">
                          {roleOption.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" onClick={() => navigate('/admin/crm')}>
                    Ακύρωση
                  </Button>
                  <Button onClick={handleCreateUser} disabled={loading}>
                    {loading ? 'Δημιουργία...' : 'Δημιουργία Χρήστη'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
