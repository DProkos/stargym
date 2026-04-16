import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebarAdmin } from "@/components/app-sidebar-admin";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Class {
  id: string;
  name: string;
  description?: string;
  time: string;
  day_of_week: number;
  duration_minutes: number;
  max_capacity: number;
  trainer: {
    name: string;
  } | null;
}

export default function ClassEditor() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  // New class form state
  const [newClass, setNewClass] = useState({
    name: '',
    description: '',
    day_of_week: 1,
    time: '09:00',
    duration_minutes: 60,
    max_capacity: 20,
  });

  const daysOfWeek = ['Κυριακή', 'Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο'];

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .order('day_of_week')
        .order('time');

      if (error) throw error;

      if (data) {
        const classesWithTrainers = await Promise.all(
          data.map(async (cls) => {
            if (cls.trainer_id) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', cls.trainer_id)
                .single();
              
              return {
                ...cls,
                trainer: { name: profile?.full_name || 'Unknown' }
              };
            }
            return { ...cls, trainer: null };
          })
        );
        setClasses(classesWithTrainers);
      }
    } catch (error: any) {
      toast({
        title: 'Σφάλμα φόρτωσης',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClass = async () => {
    if (!newClass.name.trim()) {
      toast({
        title: 'Σφάλμα',
        description: 'Το όνομα του μαθήματος είναι υποχρεωτικό',
        variant: 'destructive',
      });
      return;
    }

    setCreating(true);
    try {
      const { error } = await supabase
        .from('classes')
        .insert({
          name: newClass.name,
          description: newClass.description || null,
          day_of_week: newClass.day_of_week,
          time: newClass.time,
          duration_minutes: newClass.duration_minutes,
          max_capacity: newClass.max_capacity,
          status: 'active',
        });

      if (error) throw error;

      toast({
        title: 'Επιτυχία',
        description: 'Το μάθημα δημιουργήθηκε',
      });

      setNewClass({
        name: '',
        description: '',
        day_of_week: 1,
        time: '09:00',
        duration_minutes: 60,
        max_capacity: 20,
      });
      setDialogOpen(false);
      loadClasses();
    } catch (error: any) {
      toast({
        title: 'Σφάλμα δημιουργίας',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateClass = async (classItem: Class) => {
    setSaving(classItem.id);
    try {
      const { error } = await supabase
        .from('classes')
        .update({
          description: classItem.description,
        })
        .eq('id', classItem.id);

      if (error) throw error;

      toast({
        title: 'Αποθηκεύτηκε',
        description: 'Η περιγραφή αποθηκεύτηκε',
      });
    } catch (error: any) {
      toast({
        title: 'Σφάλμα ενημέρωσης',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(null);
    }
  };

  const handleDeleteClass = async (classId: string) => {
    try {
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', classId);

      if (error) throw error;

      toast({
        title: 'Διαγράφηκε',
        description: 'Το μάθημα διαγράφηκε',
      });
      loadClasses();
    } catch (error: any) {
      toast({
        title: 'Σφάλμα διαγραφής',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const updateClassDescription = (id: string, description: string) => {
    setClasses(prev =>
      prev.map(cls =>
        cls.id === id ? { ...cls, description } : cls
      )
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebarAdmin />
        
        <div className="flex-1 min-w-0">
          <header className="h-14 sm:h-16 border-b border-border flex items-center justify-between px-3 sm:px-6 gap-2 sticky top-0 bg-background z-30">
            <div className="flex items-center min-w-0 flex-1">
              <SidebarTrigger />
              <h1 className="ml-2 sm:ml-4 text-base sm:text-2xl font-bold truncate">Διαχείριση Μαθημάτων</h1>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="shrink-0">
                  <Plus className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Νέο Μάθημα</span>
                  <span className="sm:hidden">Νέο</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Δημιουργία Νέου Μαθήματος</DialogTitle>
                  <DialogDescription>
                    Συμπλήρωσε τα στοιχεία για το νέο μάθημα
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Όνομα Μαθήματος *</Label>
                    <Input
                      id="name"
                      value={newClass.name}
                      onChange={(e) => setNewClass(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="π.χ. Yoga, Pilates, CrossFit..."
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="description">Περιγραφή</Label>
                    <Textarea
                      id="description"
                      value={newClass.description}
                      onChange={(e) => setNewClass(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Περιγράψτε το μάθημα..."
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Ημέρα</Label>
                      <Select
                        value={String(newClass.day_of_week)}
                        onValueChange={(value) => setNewClass(prev => ({ ...prev, day_of_week: Number(value) }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {daysOfWeek.map((day, index) => (
                            <SelectItem key={index} value={String(index)}>{day}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="time">Ώρα</Label>
                      <Input
                        id="time"
                        type="time"
                        value={newClass.time}
                        onChange={(e) => setNewClass(prev => ({ ...prev, time: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="duration">Διάρκεια (λεπτά)</Label>
                      <Input
                        id="duration"
                        type="number"
                        min="15"
                        max="180"
                        value={newClass.duration_minutes}
                        onChange={(e) => setNewClass(prev => ({ ...prev, duration_minutes: Number(e.target.value) }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="capacity">Μέγιστη Χωρητικότητα</Label>
                      <Input
                        id="capacity"
                        type="number"
                        min="1"
                        max="100"
                        value={newClass.max_capacity}
                        onChange={(e) => setNewClass(prev => ({ ...prev, max_capacity: Number(e.target.value) }))}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Ακύρωση
                  </Button>
                  <Button onClick={handleCreateClass} disabled={creating}>
                    {creating ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Δημιουργία...</>
                    ) : (
                      <><Plus className="h-4 w-4 mr-2" /> Δημιουργία</>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </header>

          <main className="p-3 sm:p-6">
            <div className="max-w-4xl mx-auto">
              <div className="space-y-6">
                <div>
                  <h2 className="text-3xl font-bold">Μαθήματα</h2>
                  <p className="text-muted-foreground">Δημιούργησε και επεξεργάσου τα μαθήματα του γυμναστηρίου</p>
                </div>

                <div className="grid gap-6">
                  {classes.map((classItem) => (
                    <Card key={classItem.id} className="bg-gradient-card border-border">
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span>{classItem.name}</span>
                          <div className="flex gap-2">
                            <Badge variant="outline" className="bg-primary/20 text-primary border-primary">
                              {daysOfWeek[classItem.day_of_week]}
                            </Badge>
                            <Badge variant="outline">
                              {classItem.time}
                            </Badge>
                          </div>
                        </CardTitle>
                        <CardDescription>
                          {classItem.duration_minutes} λεπτά • Μέγιστο {classItem.max_capacity} άτομα
                          {classItem.trainer && ` • Γυμναστής: ${classItem.trainer.name}`}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label>Περιγραφή</Label>
                          <Textarea
                            value={classItem.description || ''}
                            onChange={(e) => updateClassDescription(classItem.id, e.target.value)}
                            placeholder="Προσθέστε περιγραφή για αυτό το μάθημα..."
                            rows={4}
                            className="bg-secondary border-border"
                          />
                        </div>

                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleUpdateClass(classItem)}
                            disabled={saving === classItem.id}
                          >
                            {saving === classItem.id ? (
                              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Αποθήκευση...</>
                            ) : (
                              <><Save className="h-4 w-4 mr-2" /> Αποθήκευση</>
                            )}
                          </Button>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="icon">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Διαγραφή Μαθήματος</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Είσαι σίγουρος ότι θέλεις να διαγράψεις το μάθημα "{classItem.name}"; Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Ακύρωση</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteClass(classItem.id)}>
                                  Διαγραφή
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {classes.length === 0 && (
                    <Card className="bg-gradient-card border-border">
                      <CardContent className="pt-6 text-center">
                        <p className="text-muted-foreground mb-4">Δεν υπάρχουν μαθήματα ακόμα.</p>
                        <Button onClick={() => setDialogOpen(true)}>
                          <Plus className="h-4 w-4 mr-2" />
                          Δημιούργησε το πρώτο μάθημα
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
