import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AppSidebarAdmin } from '@/components/app-sidebar-admin';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Mail, Phone, Calendar, TrendingUp, Save, Plus, X, Shield, Key, UserCog, Send, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CustomerDetail {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  customer_status: string;
  lifetime_value: number;
  total_bookings: number;
  last_booking_date: string;
  acquisition_source: string;
  notes_summary: string;
  created_at: string;
}

interface Note {
  id: string;
  content: string;
  created_at: string;
  is_pinned: boolean;
  created_by: string;
}

interface Interaction {
  id: string;
  interaction_type: string;
  title: string;
  description: string;
  created_at: string;
}

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface UserRole {
  id: string;
  role: string;
  created_at: string;
}

export default function UserDetail() {
  const { id } = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [newNote, setNewNote] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [sendingPasswordReset, setSendingPasswordReset] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sendingWelcome, setSendingWelcome] = useState(false);
  const [welcomeDialogOpen, setWelcomeDialogOpen] = useState(false);
  const [emailTemplates, setEmailTemplates] = useState<{id: string; name: string; html_template: string}[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      loadCustomerData();
    }
  }, [id]);

  const loadCustomerData = async () => {
    await Promise.all([
      loadCustomer(),
      loadNotes(),
      loadInteractions(),
      loadTags(),
      loadAllTags(),
      loadRoles(),
      loadEmailTemplates()
    ]);
    setLoading(false);
  };

  const loadCustomer = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      toast({ title: 'Error loading customer', variant: 'destructive' });
      return;
    }

    setCustomer(data);
  };

  const loadNotes = async () => {
    const { data, error } = await supabase
      .from('crm_notes')
      .select('*')
      .eq('customer_id', id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setNotes(data);
    }
  };

  const loadInteractions = async () => {
    const { data, error } = await supabase
      .from('crm_interactions')
      .select('*')
      .eq('customer_id', id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setInteractions(data);
    }
  };

  const loadTags = async () => {
    const { data, error } = await supabase
      .from('customer_tag_assignments')
      .select('customer_tags(*)')
      .eq('customer_id', id);

    if (!error && data) {
      setTags(data.map((item: any) => item.customer_tags).filter(Boolean));
    }
  };

  const loadAllTags = async () => {
    const { data, error } = await supabase
      .from('customer_tags')
      .select('*')
      .order('name');

    if (!error && data) {
      setAllTags(data);
    }
  };

  const loadRoles = async () => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setRoles(data);
    }
  };

  const loadEmailTemplates = async () => {
    const { data, error } = await supabase
      .from('email_templates')
      .select('id, name, html_template')
      .order('name');

    if (!error && data) {
      setEmailTemplates(data);
      // Auto-select welcome template if exists
      const welcomeTemplate = data.find(t => t.name.toLowerCase().includes('welcome') || t.name.toLowerCase().includes('καλωσόρισμα'));
      if (welcomeTemplate) {
        setSelectedTemplate(welcomeTemplate.id);
      } else if (data.length > 0) {
        setSelectedTemplate(data[0].id);
      }
    }
  };

  const handleSendWelcomeEmail = async () => {
    if (!customer || !selectedTemplate) {
      toast({ title: 'Επιλέξτε template email', variant: 'destructive' });
      return;
    }

    setSendingWelcome(true);
    try {
      const template = emailTemplates.find(t => t.id === selectedTemplate);
      if (!template) {
        throw new Error('Template not found');
      }

      // Replace placeholders in template
      let html = template.html_template;
      html = html.replace(/\{\{name\}\}/gi, customer.full_name || 'Αγαπητέ μέλος');
      html = html.replace(/\{\{full_name\}\}/gi, customer.full_name || 'Αγαπητέ μέλος');
      html = html.replace(/\{\{email\}\}/gi, customer.email);

      const { error } = await supabase.functions.invoke('send-email', {
        body: {
          to: customer.email,
          subject: `Καλώς ήρθατε! - ${template.name}`,
          html: html
        }
      });

      if (error) throw error;

      // Log the interaction
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.from('crm_interactions').insert({
          customer_id: id,
          interaction_type: 'email',
          title: 'Welcome Email Sent',
          description: `Στάλθηκε welcome email με template: ${template.name}`,
          created_by: session.user.id
        });
      }

      toast({ title: 'Το email στάλθηκε επιτυχώς!' });
      setWelcomeDialogOpen(false);
      loadInteractions();
    } catch (error: any) {
      console.error('Error sending welcome email:', error);
      toast({ title: 'Σφάλμα αποστολής email', description: error.message, variant: 'destructive' });
    } finally {
      setSendingWelcome(false);
    }
  };

  const handleSaveCustomer = async () => {
    if (!customer) return;

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: customer.full_name,
        phone: customer.phone,
        customer_status: customer.customer_status,
        acquisition_source: customer.acquisition_source,
        notes_summary: customer.notes_summary
      })
      .eq('id', id);

    if (error) {
      toast({ title: 'Error saving customer', variant: 'destructive' });
      return;
    }

    toast({ title: 'Customer updated successfully' });
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase
      .from('crm_notes')
      .insert({
        customer_id: id,
        content: newNote,
        created_by: session.user.id
      });

    if (error) {
      toast({ title: 'Error adding note', variant: 'destructive' });
      return;
    }

    setNewNote('');
    loadNotes();
    toast({ title: 'Note added successfully' });
  };

  const handleAddTag = async (tagId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase
      .from('customer_tag_assignments')
      .insert({
        customer_id: id,
        tag_id: tagId,
        assigned_by: session.user.id
      });

    if (error) {
      toast({ title: 'Error adding tag', variant: 'destructive' });
      return;
    }

    loadTags();
  };

  const handleRemoveTag = async (tagId: string) => {
    const { error } = await supabase
      .from('customer_tag_assignments')
      .delete()
      .eq('customer_id', id)
      .eq('tag_id', tagId);

    if (error) {
      toast({ title: 'Error removing tag', variant: 'destructive' });
      return;
    }

    loadTags();
  };

  const handleAddRole = async (newRole: string) => {
    if (!id) return;

    if (roles.some(r => r.role === newRole)) {
      toast({ title: 'Ο χρήστης έχει ήδη αυτό το ρόλο', variant: 'destructive' });
      return;
    }

    const { error } = await supabase
      .from('user_roles')
      .insert({ 
        user_id: id, 
        role: newRole as 'admin' | 'trainer' | 'member'
      });

    if (error) {
      toast({ title: 'Σφάλμα προσθήκης ρόλου', variant: 'destructive' });
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    await supabase.from('admin_activity_log').insert({
      admin_id: session?.user?.id,
      action_type: 'role_added',
      target_user_id: id,
      details: { role: newRole, user_email: customer?.email }
    });

    toast({ title: `Ρόλος "${newRole}" προστέθηκε επιτυχώς` });
    loadRoles();
  };

  const handleRemoveRole = async (roleId: string, roleName: string) => {
    if (!confirm(`Είστε σίγουροι ότι θέλετε να αφαιρέσετε τον ρόλο "${roleName}";`)) {
      return;
    }

    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('id', roleId);

    if (error) {
      toast({ title: 'Σφάλμα αφαίρεσης ρόλου', variant: 'destructive' });
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    await supabase.from('admin_activity_log').insert({
      admin_id: session?.user?.id,
      action_type: 'role_removed',
      target_user_id: id,
      details: { role: roleName, user_email: customer?.email }
    });

    toast({ title: `Ρόλος "${roleName}" αφαιρέθηκε επιτυχώς` });
    loadRoles();
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast({ title: 'Ο κωδικός πρέπει να είναι τουλάχιστον 6 χαρακτήρες', variant: 'destructive' });
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    
    const { error } = await supabase.functions.invoke('admin-update-user', {
      body: { userId: id, password: newPassword }
    });

    if (error) {
      toast({ title: 'Σφάλμα αλλαγής κωδικού', description: error.message, variant: 'destructive' });
      return;
    }

    await supabase.from('admin_activity_log').insert({
      admin_id: session?.user?.id,
      action_type: 'password_reset',
      target_user_id: id,
      details: { user_email: customer?.email }
    });

    setNewPassword('');
    toast({ title: 'Ο κωδικός άλλαξε επιτυχώς' });
  };

  const handleSendPasswordResetEmail = async () => {
    if (!customer) return;
    
    setSendingPasswordReset(true);
    try {
      // Generate a temporary password reset token/code
      const resetCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      
      // Send email with reset instructions
      const { error } = await supabase.functions.invoke('send-email', {
        body: {
          to: customer.email,
          subject: 'Επαναφορά Κωδικού Πρόσβασης',
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #6366f1;">Επαναφορά Κωδικού</h1>
              <p>Αγαπητέ/ή ${customer.full_name || 'χρήστη'},</p>
              <p>Λάβαμε αίτημα επαναφοράς του κωδικού σας.</p>
              <p>Παρακαλούμε επικοινωνήστε με τη διαχείριση για να λάβετε τον νέο σας κωδικό ή χρησιμοποιήστε την επιλογή "Ξέχασα τον κωδικό μου" στη σελίδα σύνδεσης.</p>
              <p>Αν δεν ζητήσατε επαναφορά κωδικού, παρακαλώ αγνοήστε αυτό το email.</p>
              <br>
              <p>Με εκτίμηση,<br>Η ομάδα διαχείρισης</p>
            </div>
          `,
          text: `Αγαπητέ/ή ${customer.full_name || 'χρήστη'}, Λάβαμε αίτημα επαναφοράς του κωδικού σας. Παρακαλούμε επικοινωνήστε με τη διαχείριση.`
        }
      });

      if (error) throw error;

      // Log the interaction
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.from('crm_interactions').insert({
          customer_id: id,
          interaction_type: 'email',
          title: 'Password Reset Email Sent',
          description: 'Στάλθηκε email για επαναφορά κωδικού',
          created_by: session.user.id
        });
      }

      toast({ title: 'Το email επαναφοράς κωδικού στάλθηκε!' });
      loadInteractions();
    } catch (error: any) {
      console.error('Error sending password reset email:', error);
      toast({ title: 'Σφάλμα αποστολής email', description: error.message, variant: 'destructive' });
    } finally {
      setSendingPasswordReset(false);
    }
  };

  const handleUpdateEmail = async () => {
    if (!newEmail || !newEmail.includes('@')) {
      toast({ title: 'Παρακαλώ εισάγετε έγκυρο email', variant: 'destructive' });
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    
    const { error } = await supabase.functions.invoke('admin-update-user', {
      body: { userId: id, email: newEmail }
    });

    if (error) {
      toast({ title: 'Σφάλμα αλλαγής email', description: error.message, variant: 'destructive' });
      return;
    }

    await supabase.from('admin_activity_log').insert({
      admin_id: session?.user?.id,
      action_type: 'email_updated',
      target_user_id: id,
      details: { old_email: customer?.email, new_email: newEmail }
    });

    setNewEmail('');
    toast({ title: 'Το email άλλαξε επιτυχώς' });
    loadCustomerData();
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-destructive/20 text-destructive';
      case 'trainer':
        return 'bg-primary/20 text-primary';
      case 'member':
        return 'bg-accent/20 text-accent-foreground';
      default:
        return '';
    }
  };

  if (loading || !customer) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  const availableTags = allTags.filter(tag => !tags.find(t => t.id === tag.id));

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebarAdmin />
        <main className="flex-1 overflow-auto">
          <header className="h-14 sm:h-16 border-b sticky top-0 bg-background z-30 flex items-center px-3 sm:px-6 gap-2">
            <SidebarTrigger />
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin/crm')}>
              <ArrowLeft className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Πίσω</span>
            </Button>
            <h1 className="text-base sm:text-2xl font-bold truncate ml-2">Στοιχεία Πελάτη</h1>
          </header>
          <div className="p-3 sm:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Customer Info Card */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Στοιχεία Πελάτη</CardTitle>
                    <div className="flex gap-2">
                      <Dialog open={welcomeDialogOpen} onOpenChange={setWelcomeDialogOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline">
                            <Send className="h-4 w-4 mr-2" />
                            Welcome Email
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Αποστολή Welcome Email</DialogTitle>
                            <DialogDescription>
                              Επιλέξτε template και στείλτε welcome email στον χρήστη {customer.email}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="py-4 space-y-4">
                            <div>
                              <Label>Template Email</Label>
                              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Επιλέξτε template..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {emailTemplates.map(template => (
                                    <SelectItem key={template.id} value={template.id}>
                                      {template.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            {emailTemplates.length === 0 && (
                              <p className="text-sm text-muted-foreground">
                                Δεν υπάρχουν διαθέσιμα templates. Δημιουργήστε πρώτα ένα template από τα Email Templates.
                              </p>
                            )}
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setWelcomeDialogOpen(false)}>
                              Ακύρωση
                            </Button>
                            <Button 
                              onClick={handleSendWelcomeEmail} 
                              disabled={sendingWelcome || !selectedTemplate}
                            >
                              {sendingWelcome ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Αποστολή...
                                </>
                              ) : (
                                <>
                                  <Send className="h-4 w-4 mr-2" />
                                  Αποστολή
                                </>
                              )}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      <Button onClick={handleSaveCustomer}>
                        <Save className="h-4 w-4 mr-2" />
                        Αποθήκευση
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Ονοματεπώνυμο</Label>
                      <Input
                        value={customer.full_name || ''}
                        onChange={(e) => setCustomer({ ...customer, full_name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input value={customer.email} disabled />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Τηλέφωνο</Label>
                      <Input
                        value={customer.phone || ''}
                        onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Status</Label>
                      <Select
                        value={customer.customer_status}
                        onValueChange={(value) => setCustomer({ ...customer, customer_status: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="lead">Lead</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label>Acquisition Source</Label>
                    <Input
                      value={customer.acquisition_source || ''}
                      onChange={(e) => setCustomer({ ...customer, acquisition_source: e.target.value })}
                      placeholder="π.χ. Website, Referral, Social Media"
                    />
                  </div>

                  <div>
                    <Label>Tags</Label>
                    <div className="flex flex-wrap gap-2 mt-2 mb-2">
                      {tags.map(tag => (
                        <Badge
                          key={tag.id}
                          style={{ backgroundColor: tag.color }}
                          className="text-white cursor-pointer"
                          onClick={() => handleRemoveTag(tag.id)}
                        >
                          {tag.name}
                          <X className="h-3 w-3 ml-1" />
                        </Badge>
                      ))}
                    </div>
                    {availableTags.length > 0 && (
                      <Select onValueChange={handleAddTag}>
                        <SelectTrigger>
                          <SelectValue placeholder="Προσθήκη tag..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availableTags.map(tag => (
                            <SelectItem key={tag.id} value={tag.id}>
                              {tag.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Tabs defaultValue="roles" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="roles">Δικαιώματα</TabsTrigger>
                  <TabsTrigger value="security">Ασφάλεια</TabsTrigger>
                  <TabsTrigger value="notes">Σημειώσεις</TabsTrigger>
                  <TabsTrigger value="interactions">Αλληλεπιδράσεις</TabsTrigger>
                </TabsList>

                <TabsContent value="roles">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5" />
                            Ρόλοι Χρήστη
                          </CardTitle>
                          <CardDescription>
                            Διαχείριση ρόλων και δικαιωμάτων
                          </CardDescription>
                        </div>
                        <Select onValueChange={handleAddRole}>
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Προσθήκη ρόλου" />
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
                          Δεν υπάρχουν ρόλοι
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {roles.map((roleItem) => (
                            <div key={roleItem.id} className="flex items-center justify-between p-3 border rounded-lg">
                              <div className="flex items-center gap-3">
                                <Badge className={getRoleBadgeColor(roleItem.role)}>
                                  {roleItem.role}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                  Προστέθηκε: {new Date(roleItem.created_at).toLocaleDateString()}
                                </span>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveRole(roleItem.id, roleItem.role)}
                              >
                                Αφαίρεση
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="security">
                  <div className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Key className="h-5 w-5" />
                          Αλλαγή Κωδικού
                        </CardTitle>
                        <CardDescription>
                          Ορίστε νέο κωδικό για τον χρήστη
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label>Νέος Κωδικός (τουλάχιστον 6 χαρακτήρες)</Label>
                          <Input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Εισάγετε νέο κωδικό..."
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={handleResetPassword} disabled={!newPassword}>
                            <Key className="h-4 w-4 mr-2" />
                            Αλλαγή Κωδικού
                          </Button>
                          <Button 
                            variant="outline" 
                            onClick={handleSendPasswordResetEmail}
                            disabled={sendingPasswordReset}
                          >
                            {sendingPasswordReset ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Send className="h-4 w-4 mr-2" />
                            )}
                            Αποστολή Link Επαναφοράς
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Mail className="h-5 w-5" />
                          Αλλαγή Email
                        </CardTitle>
                        <CardDescription>
                          Ενημερώστε τη διεύθυνση email του χρήστη
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label>Τρέχον Email</Label>
                          <Input value={customer.email} disabled />
                        </div>
                        <div>
                          <Label>Νέο Email</Label>
                          <Input
                            type="email"
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            placeholder="Εισάγετε νέο email..."
                          />
                        </div>
                        <Button onClick={handleUpdateEmail} disabled={!newEmail}>
                          <Mail className="h-4 w-4 mr-2" />
                          Αλλαγή Email
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="notes">
                  <Card>
                    <CardHeader>
                      <CardTitle>Notes</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex gap-2">
                        <Textarea
                          placeholder="Προσθήκη νέας σημείωσης..."
                          value={newNote}
                          onChange={(e) => setNewNote(e.target.value)}
                        />
                        <Button onClick={handleAddNote}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="space-y-2">
                        {notes.map(note => (
                          <div key={note.id} className="p-3 border rounded-lg">
                            <p className="text-sm">{note.content}</p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {new Date(note.created_at).toLocaleString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="interactions">
                  <Card>
                    <CardHeader>
                      <CardTitle>Ιστορικό Interactions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {interactions.map(interaction => (
                          <div key={interaction.id} className="p-3 border rounded-lg">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge>{interaction.interaction_type}</Badge>
                              <span className="font-medium">{interaction.title}</span>
                            </div>
                            {interaction.description && (
                              <p className="text-sm text-muted-foreground">{interaction.description}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-2">
                              {new Date(interaction.created_at).toLocaleString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>

            {/* Stats Sidebar */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Customer Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Lifetime Value</span>
                    <span className="font-bold text-lg">€{customer.lifetime_value?.toFixed(2) || '0.00'}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Bookings</span>
                    <span className="font-bold text-lg">{customer.total_bookings || 0}</span>
                  </div>

                  {customer.last_booking_date && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Last Booking</span>
                      <span className="text-sm">
                        {new Date(customer.last_booking_date).toLocaleDateString()}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Member Since</span>
                    <span className="text-sm">
                      {new Date(customer.created_at).toLocaleDateString()}
                    </span>
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