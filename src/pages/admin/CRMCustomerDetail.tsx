import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AppSidebarAdmin } from '@/components/app-sidebar-admin';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Mail, Phone, Calendar, TrendingUp, Save, Plus, X } from 'lucide-react';
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

export default function CRMCustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(true);
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
      loadAllTags()
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

  if (loading || !customer) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  const availableTags = allTags.filter(tag => !tags.find(t => t.id === tag.id));

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebarAdmin />
        <main className="flex-1 p-6 overflow-auto">
          <div className="mb-6">
            <Button variant="ghost" onClick={() => navigate('/admin/crm')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Πίσω στο CRM
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Customer Info Card */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Στοιχεία Πελάτη</CardTitle>
                    <Button onClick={handleSaveCustomer}>
                      <Save className="h-4 w-4 mr-2" />
                      Αποθήκευση
                    </Button>
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

              <Tabs defaultValue="notes" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="notes">Notes</TabsTrigger>
                  <TabsTrigger value="interactions">Interactions</TabsTrigger>
                </TabsList>

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