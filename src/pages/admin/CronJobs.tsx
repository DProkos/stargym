import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebarAdmin } from "@/components/app-sidebar-admin";
import { 
  Clock, 
  Play, 
  RefreshCw, 
  Plus,
  Calendar,
  Bell,
  Mail,
  Users,
  Save,
  Trash2,
  Pencil
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Automation {
  id: string;
  name: string;
  description: string | null;
  automation_type: string;
  schedule: string;
  is_active: boolean;
  config: any;
  last_run_at: string | null;
  created_at: string;
}

const AUTOMATION_TYPES = [
  { value: 'class_reminder', label: 'Υπενθύμιση Μαθήματος', icon: Calendar, description: 'Στέλνει υπενθύμιση στα μέλη για επερχόμενα μαθήματα' },
  { value: 'subscription_reminder', label: 'Υπενθύμιση Συνδρομής', icon: Users, description: 'Στέλνει υπενθύμιση για λήξη συνδρομής' },
  { value: 'newsletter', label: 'Newsletter', icon: Mail, description: 'Αυτόματη αποστολή newsletter' },
];

const SCHEDULE_PRESETS = [
  { value: '0 9 * * *', label: 'Κάθε μέρα στις 9:00' },
  { value: '0 8 * * *', label: 'Κάθε μέρα στις 8:00' },
  { value: '0 10 * * *', label: 'Κάθε μέρα στις 10:00' },
  { value: '0 9 * * 1', label: 'Κάθε Δευτέρα στις 9:00' },
  { value: '0 9 * * 1-5', label: 'Καθημερινές (Δευ-Παρ) στις 9:00' },
  { value: '0 9 1 * *', label: 'Κάθε 1η του μήνα στις 9:00' },
];

export default function CronJobs() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState<Automation | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    automation_type: 'class_reminder',
    schedule: '0 9 * * *',
    is_active: true,
    config: {},
  });

  useEffect(() => {
    checkAuth();
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
      .eq('user_id', session.user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      navigate('/');
      return;
    }

    loadAutomations();
  };

  const loadAutomations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('automations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAutomations(data || []);
    } catch (error) {
      console.error('Error loading automations:', error);
      toast({
        title: 'Σφάλμα',
        description: 'Αποτυχία φόρτωσης αυτοματισμών',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.automation_type) {
      toast({
        title: 'Σφάλμα',
        description: 'Συμπλήρωσε όλα τα υποχρεωτικά πεδία',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      if (editingAutomation) {
        const { error } = await supabase
          .from('automations')
          .update({
            name: formData.name,
            description: formData.description || null,
            automation_type: formData.automation_type,
            schedule: formData.schedule,
            is_active: formData.is_active,
            config: formData.config,
          })
          .eq('id', editingAutomation.id);

        if (error) throw error;
        toast({ title: 'Επιτυχία', description: 'Ο αυτοματισμός ενημερώθηκε' });
      } else {
        const { error } = await supabase
          .from('automations')
          .insert({
            name: formData.name,
            description: formData.description || null,
            automation_type: formData.automation_type,
            schedule: formData.schedule,
            is_active: formData.is_active,
            config: formData.config,
            created_by: session.user.id,
          });

        if (error) throw error;
        toast({ title: 'Επιτυχία', description: 'Ο αυτοματισμός δημιουργήθηκε' });
      }

      setShowDialog(false);
      setEditingAutomation(null);
      resetForm();
      loadAutomations();
    } catch (error: any) {
      console.error('Error saving automation:', error);
      toast({
        title: 'Σφάλμα',
        description: error.message || 'Αποτυχία αποθήκευσης',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Είσαι σίγουρος ότι θέλεις να διαγράψεις αυτόν τον αυτοματισμό;')) return;

    try {
      const { error } = await supabase.from('automations').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Επιτυχία', description: 'Ο αυτοματισμός διαγράφηκε' });
      loadAutomations();
    } catch (error: any) {
      toast({
        title: 'Σφάλμα',
        description: error.message || 'Αποτυχία διαγραφής',
        variant: 'destructive',
      });
    }
  };

  const handleToggleActive = async (automation: Automation) => {
    try {
      const { error } = await supabase
        .from('automations')
        .update({ is_active: !automation.is_active })
        .eq('id', automation.id);

      if (error) throw error;
      loadAutomations();
    } catch (error) {
      console.error('Error toggling automation:', error);
    }
  };

  const handleExecute = async (automation: Automation) => {
    setExecuting(automation.id);
    try {
      let functionName = '';
      switch (automation.automation_type) {
        case 'class_reminder':
          functionName = 'send-class-reminders';
          break;
        case 'subscription_reminder':
          functionName = 'send-class-reminders'; // TODO: create dedicated function
          break;
        case 'newsletter':
          functionName = 'send-mass-email';
          break;
        default:
          throw new Error('Unknown automation type');
      }

      const { error } = await supabase.functions.invoke(functionName, {
        body: { automationId: automation.id },
      });

      if (error) throw error;

      // Update last_run_at
      await supabase
        .from('automations')
        .update({ last_run_at: new Date().toISOString() })
        .eq('id', automation.id);

      toast({ title: 'Επιτυχία', description: 'Ο αυτοματισμός εκτελέστηκε' });
      loadAutomations();
    } catch (error: any) {
      toast({
        title: 'Σφάλμα',
        description: error.message || 'Αποτυχία εκτέλεσης',
        variant: 'destructive',
      });
    } finally {
      setExecuting(null);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      automation_type: 'class_reminder',
      schedule: '0 9 * * *',
      is_active: true,
      config: {},
    });
  };

  const openEditDialog = (automation: Automation) => {
    setEditingAutomation(automation);
    setFormData({
      name: automation.name,
      description: automation.description || '',
      automation_type: automation.automation_type,
      schedule: automation.schedule,
      is_active: automation.is_active,
      config: automation.config || {},
    });
    setShowDialog(true);
  };

  const openCreateDialog = () => {
    setEditingAutomation(null);
    resetForm();
    setShowDialog(true);
  };

  const getTypeInfo = (type: string) => {
    return AUTOMATION_TYPES.find(t => t.value === type) || AUTOMATION_TYPES[0];
  };

  const parseSchedule = (schedule: string): string => {
    const preset = SCHEDULE_PRESETS.find(p => p.value === schedule);
    if (preset) return preset.label;
    
    const parts = schedule.split(' ');
    if (parts.length === 5) {
      const [minute, hour] = parts;
      return `${hour}:${minute.padStart(2, '0')}`;
    }
    return schedule;
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebarAdmin />
        
        <div className="flex-1 min-w-0">
          <header className="h-14 sm:h-16 border-b border-border flex items-center justify-between px-3 sm:px-6 gap-2 sticky top-0 bg-background z-30">
            <div className="flex items-center min-w-0 flex-1">
              <SidebarTrigger />
              <h1 className="ml-2 sm:ml-4 text-base sm:text-2xl font-bold truncate">Αυτοματισμοί</h1>
            </div>
            <Button onClick={openCreateDialog} size="sm" className="flex items-center gap-1 sm:gap-2 shrink-0">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Νέος Αυτοματισμός</span>
              <span className="sm:hidden">Νέος</span>
            </Button>
          </header>

          <main className="p-3 sm:p-6">
            <div className="max-w-6xl mx-auto space-y-6">
              {/* Overview Cards */}
              <div className="grid gap-4 md:grid-cols-3">
                {AUTOMATION_TYPES.map(type => {
                  const count = automations.filter(a => a.automation_type === type.value).length;
                  const activeCount = automations.filter(a => a.automation_type === type.value && a.is_active).length;
                  const Icon = type.icon;
                  return (
                    <Card key={type.value} className="bg-gradient-card border-border">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                          <div className="p-3 rounded-lg bg-primary/10">
                            <Icon className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">{type.label}</p>
                            <p className="text-2xl font-bold">{activeCount}/{count}</p>
                            <p className="text-xs text-muted-foreground">ενεργά</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Automations List */}
              {loading ? (
                <Card className="bg-gradient-card border-border">
                  <CardContent className="pt-6">
                    <p className="text-center text-muted-foreground">Φόρτωση...</p>
                  </CardContent>
                </Card>
              ) : automations.length === 0 ? (
                <Card className="bg-gradient-card border-border">
                  <CardContent className="pt-6 text-center">
                    <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">Δεν υπάρχουν αυτοματισμοί</p>
                    <Button onClick={openCreateDialog}>
                      <Plus className="h-4 w-4 mr-2" />
                      Δημιουργία Αυτοματισμού
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {automations.map((automation) => {
                    const typeInfo = getTypeInfo(automation.automation_type);
                    const Icon = typeInfo.icon;
                    return (
                      <Card key={automation.id} className="bg-gradient-card border-border">
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${automation.is_active ? 'bg-primary/10' : 'bg-muted/20'}`}>
                                <Icon className={`h-5 w-5 ${automation.is_active ? 'text-primary' : 'text-muted-foreground'}`} />
                              </div>
                              <div>
                                <CardTitle className="text-lg">{automation.name}</CardTitle>
                                <CardDescription>{typeInfo.label}</CardDescription>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <Switch
                                checked={automation.is_active}
                                onCheckedChange={() => handleToggleActive(automation)}
                              />
                              <Badge variant={automation.is_active ? 'default' : 'secondary'}>
                                {automation.is_active ? 'Ενεργό' : 'Ανενεργό'}
                              </Badge>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {automation.description && (
                            <p className="text-sm text-muted-foreground">{automation.description}</p>
                          )}
                          
                          <div className="grid gap-4 md:grid-cols-3">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-xs text-muted-foreground">Χρονοδιάγραμμα</p>
                                <p className="text-sm font-medium">{parseSchedule(automation.schedule)}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-xs text-muted-foreground">Τελευταία εκτέλεση</p>
                                <p className="text-sm font-medium">
                                  {automation.last_run_at 
                                    ? new Date(automation.last_run_at).toLocaleString('el-GR')
                                    : 'Ποτέ'}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-2 pt-4 border-t border-border">
                            <Button
                              onClick={() => handleExecute(automation)}
                              disabled={executing === automation.id}
                              size="sm"
                              className="flex items-center gap-2"
                            >
                              <Play className="h-4 w-4" />
                              {executing === automation.id ? 'Εκτέλεση...' : 'Εκτέλεση τώρα'}
                            </Button>
                            <Button
                              onClick={() => openEditDialog(automation)}
                              size="sm"
                              variant="outline"
                            >
                              <Pencil className="h-4 w-4 mr-2" />
                              Επεξεργασία
                            </Button>
                            <Button
                              onClick={() => handleDelete(automation.id)}
                              size="sm"
                              variant="outline"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}

              {/* Refresh Button */}
              <div className="flex justify-center">
                <Button onClick={loadAutomations} variant="outline" className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Ανανέωση
                </Button>
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg bg-card border-border">
          <DialogHeader>
            <DialogTitle>
              {editingAutomation ? 'Επεξεργασία Αυτοματισμού' : 'Νέος Αυτοματισμός'}
            </DialogTitle>
            <DialogDescription>
              Δημιούργησε αυτόματες υπενθυμίσεις για μαθήματα, συνδρομές ή newsletters
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Όνομα *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="π.χ. Υπενθύμιση μαθημάτων αύριο"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Περιγραφή</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Περιγραφή του αυτοματισμού..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Τύπος Αυτοματισμού *</Label>
              <Select
                value={formData.automation_type}
                onValueChange={(value) => setFormData({ ...formData, automation_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AUTOMATION_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <type.icon className="h-4 w-4" />
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {getTypeInfo(formData.automation_type).description}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Χρονοδιάγραμμα *</Label>
              <Select
                value={formData.schedule}
                onValueChange={(value) => setFormData({ ...formData, schedule: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCHEDULE_PRESETS.map(preset => (
                    <SelectItem key={preset.value} value={preset.value}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Προσαρμοσμένο Schedule (Cron format)</Label>
              <Input
                value={formData.schedule}
                onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
                placeholder="0 9 * * *"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Format: λεπτό ώρα μέρα-μήνα μήνας μέρα-εβδομάδας
              </p>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="is_active">Ενεργοποίηση</Label>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Ακύρωση
            </Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              {editingAutomation ? 'Αποθήκευση' : 'Δημιουργία'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}