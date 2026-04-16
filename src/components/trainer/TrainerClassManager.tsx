import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Save, Trash2, Clock, Users, Calendar, XCircle, Pause, Edit } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface Class {
  id: string;
  name: string;
  description: string;
  time: string;
  day_of_week: number;
  duration_minutes: number;
  max_capacity: number;
  status: 'active' | 'cancelled' | 'postponed';
  specific_date: string | null;
  schedules?: Schedule[];
}

interface Schedule {
  id?: string;
  day_of_week: number;
  time: string;
}

interface TrainerClassManagerProps {
  trainerId: string;
  onClassesChange?: () => void;
}

export function TrainerClassManager({ trainerId, onClassesChange }: TrainerClassManagerProps) {
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditScheduleDialogOpen, setIsEditScheduleDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [editingSchedules, setEditingSchedules] = useState<Schedule[]>([]);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedClassForStatus, setSelectedClassForStatus] = useState<Class | null>(null);
  const [statusChangeReason, setStatusChangeReason] = useState('');
  const [trainerName, setTrainerName] = useState('');
  const { toast } = useToast();

  const daysOfWeek = ['Κυριακή', 'Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο'];

  // New class form state
  const [classType, setClassType] = useState<'recurring' | 'onetime'>('recurring');
  const [newClass, setNewClass] = useState({
    name: '',
    description: '',
    duration_minutes: 60,
    max_capacity: 20,
    specific_date: '',
    schedules: [{ day_of_week: 1, time: '' }] as Schedule[],
  });

  useEffect(() => {
    loadClasses();
    loadTrainerName();
  }, [trainerId]);

  const loadTrainerName = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', trainerId)
      .single();
    
    if (data?.full_name) {
      setTrainerName(data.full_name);
    }
  };

  const loadClasses = async () => {
    try {
      // Load classes
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select('*')
        .eq('trainer_id', trainerId)
        .order('day_of_week')
        .order('time');

      if (classesError) throw classesError;

      // Load schedules for all classes
      const { data: schedulesData, error: schedulesError } = await supabase
        .from('class_schedules')
        .select('*');

      if (schedulesError) throw schedulesError;

      if (classesData) {
        // Combine classes with their schedules
        const typedClasses = classesData.map(cls => ({
          ...cls,
          status: cls.status as 'active' | 'cancelled' | 'postponed',
          schedules: schedulesData?.filter(s => s.class_id === cls.id) || []
        }));
        setClasses(typedClasses);
      }
    } catch (error: any) {
      toast({
        title: 'Error loading classes',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClass = async () => {
    // Validate based on class type
    const validSchedules = newClass.schedules.filter(s => s.time);
    
    if (!newClass.name) {
      toast({
        title: 'Λείπουν πληροφορίες',
        description: 'Παρακαλώ συμπληρώστε το όνομα του μαθήματος',
        variant: 'destructive',
      });
      return;
    }

    if (classType === 'onetime' && !newClass.specific_date) {
      toast({
        title: 'Λείπουν πληροφορίες',
        description: 'Παρακαλώ επιλέξτε ημερομηνία για το μάθημα',
        variant: 'destructive',
      });
      return;
    }

    if (validSchedules.length === 0) {
      toast({
        title: 'Λείπουν πληροφορίες',
        description: 'Παρακαλώ συμπληρώστε τουλάχιστον μία ώρα',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      // For one-time classes with specific date
      if (classType === 'onetime') {
        const dayOfWeek = new Date(newClass.specific_date).getDay();
        const { error } = await supabase
          .from('classes')
          .insert({
            name: newClass.name,
            description: newClass.description,
            time: validSchedules[0].time,
            day_of_week: dayOfWeek,
            duration_minutes: newClass.duration_minutes,
            max_capacity: newClass.max_capacity,
            specific_date: newClass.specific_date,
            trainer_id: trainerId,
          });

        if (error) throw error;
      } else {
        // For recurring classes with multiple schedules
        // Create a class entry for each schedule
        for (const schedule of validSchedules) {
          const { data: classData, error: classError } = await supabase
            .from('classes')
            .insert({
              name: newClass.name,
              description: newClass.description,
              time: schedule.time,
              day_of_week: schedule.day_of_week,
              duration_minutes: newClass.duration_minutes,
              max_capacity: newClass.max_capacity,
              specific_date: null,
              trainer_id: trainerId,
            })
            .select('id')
            .single();

          if (classError) throw classError;

          // Also add to class_schedules table for reference
          if (classData) {
            await supabase
              .from('class_schedules')
              .insert({
                class_id: classData.id,
                day_of_week: schedule.day_of_week,
                time: schedule.time,
              });
          }
        }
      }

      toast({
        title: 'Μάθημα δημιουργήθηκε',
        description: `Το μάθημα προστέθηκε με ${validSchedules.length} πρόγραμμα(τα)`,
      });

      setIsDialogOpen(false);
      setClassType('recurring');
      setNewClass({
        name: '',
        description: '',
        duration_minutes: 60,
        max_capacity: 20,
        specific_date: '',
        schedules: [{ day_of_week: 1, time: '' }],
      });
      
      loadClasses();
      if (onClassesChange) onClassesChange();
    } catch (error: any) {
      toast({
        title: 'Σφάλμα δημιουργίας',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateClass = async (classItem: Class) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('classes')
        .update({
          name: classItem.name,
          description: classItem.description,
          time: classItem.time,
          day_of_week: classItem.day_of_week,
          duration_minutes: classItem.duration_minutes,
          max_capacity: classItem.max_capacity,
        })
        .eq('id', classItem.id);

      if (error) throw error;

      toast({
        title: 'Class updated',
        description: 'Changes have been saved',
      });
      
      if (onClassesChange) onClassesChange();
    } catch (error: any) {
      toast({
        title: 'Error updating class',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChangeClassStatus = async (classItem: Class, newStatus: 'cancelled' | 'postponed') => {
    setSaving(true);
    try {
      const oldStatus = classItem.status;

      // Update class status
      const { error: updateError } = await supabase
        .from('classes')
        .update({ status: newStatus })
        .eq('id', classItem.id);

      if (updateError) throw updateError;

      // Record status change
      const { error: logError } = await supabase
        .from('class_status_changes')
        .insert({
          class_id: classItem.id,
          changed_by: trainerId,
          old_status: oldStatus,
          new_status: newStatus,
          reason: statusChangeReason || null,
        });

      if (logError) throw logError;

      // Send notifications to all enrolled users
      const { error: notifyError } = await supabase.functions.invoke('notify-class-status-change', {
        body: {
          classId: classItem.id,
          className: classItem.name,
          status: newStatus,
          reason: statusChangeReason,
          trainerName: trainerName || 'Your trainer',
        },
      });

      if (notifyError) {
        console.error('Error sending notifications:', notifyError);
        toast({
          title: 'Status updated',
          description: 'Status updated but failed to send some notifications',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Status updated',
          description: `Class ${newStatus} and all enrolled members have been notified`,
        });
      }

      setStatusDialogOpen(false);
      setSelectedClassForStatus(null);
      setStatusChangeReason('');
      loadClasses();
      if (onClassesChange) onClassesChange();
    } catch (error: any) {
      toast({
        title: 'Error updating status',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClass = async (classId: string) => {
    if (!confirm('Are you sure you want to delete this class? All bookings will be affected.')) {
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', classId);

      if (error) throw error;

      toast({
        title: 'Class deleted',
        description: 'The class has been removed',
      });

      loadClasses();
      if (onClassesChange) onClassesChange();
    } catch (error: any) {
      toast({
        title: 'Error deleting class',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const openEditScheduleDialog = (classItem: Class) => {
    setEditingClass(classItem);
    setEditingSchedules(classItem.schedules?.length ? 
      classItem.schedules.map(s => ({ id: s.id, day_of_week: s.day_of_week, time: s.time })) :
      [{ day_of_week: classItem.day_of_week, time: classItem.time }]
    );
    setIsEditScheduleDialogOpen(true);
  };

  const handleSaveSchedules = async () => {
    if (!editingClass) return;
    
    const validSchedules = editingSchedules.filter(s => s.time);
    if (validSchedules.length === 0) {
      toast({
        title: 'Σφάλμα',
        description: 'Πρέπει να υπάρχει τουλάχιστον ένα πρόγραμμα',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      // Delete existing schedules for this class
      await supabase
        .from('class_schedules')
        .delete()
        .eq('class_id', editingClass.id);

      // Insert new schedules
      const schedulesToInsert = validSchedules.map(s => ({
        class_id: editingClass.id,
        day_of_week: s.day_of_week,
        time: s.time,
      }));

      const { error: insertError } = await supabase
        .from('class_schedules')
        .insert(schedulesToInsert);

      if (insertError) throw insertError;

      // Update the main class with the first schedule's day/time for backwards compatibility
      const { error: updateError } = await supabase
        .from('classes')
        .update({
          day_of_week: validSchedules[0].day_of_week,
          time: validSchedules[0].time,
        })
        .eq('id', editingClass.id);

      if (updateError) throw updateError;

      toast({
        title: 'Πρόγραμμα ενημερώθηκε',
        description: `Αποθηκεύτηκαν ${validSchedules.length} χρονοθυρίδες`,
      });

      setIsEditScheduleDialogOpen(false);
      setEditingClass(null);
      setEditingSchedules([]);
      loadClasses();
      if (onClassesChange) onClassesChange();
    } catch (error: any) {
      toast({
        title: 'Σφάλμα',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const updateClassField = (id: string, field: keyof Class, value: any) => {
    setClasses(prev =>
      prev.map(cls =>
        cls.id === id ? { ...cls, [field]: value } : cls
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-xl sm:text-2xl font-bold">Manage Your Classes</h3>
          <p className="text-sm text-muted-foreground">Create and edit your training classes</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Add New Class
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl w-[calc(100vw-1.5rem)] max-h-[90dvh] overflow-y-auto overscroll-contain">
            <DialogHeader>
              <DialogTitle>Create New Class</DialogTitle>
              <DialogDescription>Add a new training class to your schedule</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="new-name">Class Name *</Label>
                <Input
                  id="new-name"
                  value={newClass.name}
                  onChange={(e) => setNewClass({ ...newClass, name: e.target.value })}
                  placeholder="e.g., Morning Yoga"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-description">Description</Label>
                <Textarea
                  id="new-description"
                  value={newClass.description}
                  onChange={(e) => setNewClass({ ...newClass, description: e.target.value })}
                  placeholder="Describe what students can expect..."
                  rows={3}
                />
              </div>

              {/* Class Type Toggle */}
              <div className="space-y-3">
                <Label>Τύπος Μαθήματος *</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={classType === 'recurring' ? 'default' : 'outline'}
                    className="w-full justify-start h-auto min-h-[3.5rem] py-2 px-3 whitespace-normal"
                    onClick={() => {
                      setClassType('recurring');
                      setNewClass({ ...newClass, specific_date: '' });
                    }}
                  >
                    <Calendar className="h-4 w-4 mr-2 shrink-0" />
                    <div className="text-left min-w-0 flex-1">
                      <div className="font-medium text-sm leading-tight break-words">Επαναλαμβανόμενο</div>
                      <div className="text-xs opacity-70 leading-tight">Κάθε εβδομάδα</div>
                    </div>
                  </Button>
                  <Button
                    type="button"
                    variant={classType === 'onetime' ? 'default' : 'outline'}
                    className="w-full justify-start h-auto min-h-[3.5rem] py-2 px-3 whitespace-normal"
                    onClick={() => {
                      setClassType('onetime');
                      setNewClass({ ...newClass, schedules: [{ day_of_week: 1, time: '' }] });
                    }}
                  >
                    <Clock className="h-4 w-4 mr-2 shrink-0" />
                    <div className="text-left min-w-0 flex-1">
                      <div className="font-medium text-sm leading-tight break-words">Μοναδική Ημερομηνία</div>
                      <div className="text-xs opacity-70 leading-tight">Μία φορά μόνο</div>
                    </div>
                  </Button>
                </div>
              </div>

              {/* Recurring class - multiple schedules */}
              {classType === 'recurring' && (
                <div className="space-y-3 p-4 rounded-lg border border-border bg-muted/30">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-medium">Πρόγραμμα (Ημέρες & Ώρες) *</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setNewClass({
                        ...newClass,
                        schedules: [...newClass.schedules, { day_of_week: 1, time: '' }]
                      })}
                    >
                      <Plus className="h-4 w-4 mr-1" /> Προσθήκη ημέρας
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Το μάθημα θα εμφανίζεται κάθε εβδομάδα στις επιλεγμένες ημέρες/ώρες
                  </p>
                  
                  {newClass.schedules.map((schedule, index) => (
                    <div key={index} className="flex gap-2 items-end">
                      <div className="flex-1 space-y-1">
                        <Label className="text-xs">Ημέρα</Label>
                        <Select
                          value={schedule.day_of_week.toString()}
                          onValueChange={(value) => {
                            const updated = [...newClass.schedules];
                            updated[index].day_of_week = parseInt(value);
                            setNewClass({ ...newClass, schedules: updated });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {daysOfWeek.map((day, idx) => (
                              <SelectItem key={idx} value={idx.toString()}>
                                {day}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex-1 space-y-1">
                        <Label className="text-xs">Ώρα</Label>
                        <Input
                          type="time"
                          value={schedule.time}
                          onChange={(e) => {
                            const updated = [...newClass.schedules];
                            updated[index].time = e.target.value;
                            setNewClass({ ...newClass, schedules: updated });
                          }}
                        />
                      </div>
                      {newClass.schedules.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const updated = newClass.schedules.filter((_, i) => i !== index);
                            setNewClass({ ...newClass, schedules: updated });
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* One-time class - specific date */}
              {classType === 'onetime' && (
                <div className="space-y-3 p-4 rounded-lg border border-border bg-muted/30">
                  <Label className="text-base font-medium">Ημερομηνία & Ώρα *</Label>
                  <p className="text-xs text-muted-foreground">
                    Το μάθημα θα γίνει μόνο μία φορά στην επιλεγμένη ημερομηνία
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs">Ημερομηνία</Label>
                      <Input
                        type="date"
                        value={newClass.specific_date}
                        onChange={(e) => setNewClass({ ...newClass, specific_date: e.target.value })}
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Ώρα</Label>
                      <Input
                        type="time"
                        value={newClass.schedules[0]?.time || ''}
                        onChange={(e) => setNewClass({ 
                          ...newClass, 
                          schedules: [{ day_of_week: newClass.specific_date ? new Date(newClass.specific_date).getDay() : 1, time: e.target.value }] 
                        })}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="new-duration">Διάρκεια (λεπτά)</Label>
                  <Input
                    id="new-duration"
                    type="number"
                    min="15"
                    step="15"
                    value={newClass.duration_minutes}
                    onChange={(e) => setNewClass({ ...newClass, duration_minutes: parseInt(e.target.value) })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-capacity">Μέγιστη χωρητικότητα</Label>
                  <Input
                    id="new-capacity"
                    type="number"
                    min="1"
                    value={newClass.max_capacity}
                    onChange={(e) => setNewClass({ ...newClass, max_capacity: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <Button onClick={handleCreateClass} disabled={saving} className="w-full">
                {saving ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Δημιουργία...</>
                ) : (
                  <><Plus className="h-4 w-4 mr-2" /> Δημιουργία Μαθήματος</>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6">
        {classes.map((classItem) => (
          <Card key={classItem.id} className="bg-gradient-card border-border">
            <CardHeader>
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Input
                      value={classItem.name}
                      onChange={(e) => updateClassField(classItem.id, 'name', e.target.value)}
                      className="text-lg sm:text-xl font-bold h-auto border-0 p-0 bg-transparent focus-visible:ring-0 min-w-0 flex-1"
                    />
                    {classItem.status !== 'active' && (
                      <Badge 
                        variant="outline" 
                        className={
                          classItem.status === 'cancelled' 
                            ? 'bg-destructive/20 text-destructive border-destructive' 
                            : 'bg-yellow-500/20 text-yellow-600 border-yellow-500'
                        }
                      >
                        {classItem.status === 'cancelled' ? 'Ακυρώθηκε' : 'Αναβλήθηκε'}
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="outline" className="bg-primary/20 text-primary border-primary max-w-full break-all">
                      <Calendar className="h-3 w-3 mr-1 shrink-0" />
                      <span className="truncate">
                      {classItem.schedules && classItem.schedules.length > 0 
                        ? classItem.schedules.map(s => daysOfWeek[s.day_of_week]).join(', ')
                        : daysOfWeek[classItem.day_of_week]
                      }
                      </span>
                    </Badge>
                    <Badge variant="outline" className="max-w-full break-all">
                      <Clock className="h-3 w-3 mr-1 shrink-0" />
                      <span className="truncate">
                      {classItem.schedules && classItem.schedules.length > 0
                        ? classItem.schedules.map(s => s.time).join(', ')
                        : classItem.time
                      }
                      </span>
                    </Badge>
                    <Badge variant="outline">
                      {classItem.duration_minutes} min
                    </Badge>
                    <Badge variant="outline">
                      <Users className="h-3 w-3 mr-1" />
                      Max {classItem.max_capacity}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2"
                      onClick={() => openEditScheduleDialog(classItem)}
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      <span className="hidden sm:inline">Επεξεργασία Προγράμματος</span>
                      <span className="sm:hidden">Επεξεργασία</span>
                    </Button>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap lg:flex-nowrap">
                  {classItem.status === 'active' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedClassForStatus(classItem);
                          setStatusDialogOpen(true);
                        }}
                        disabled={saving}
                      >
                        <Pause className="h-4 w-4 mr-1" />
                        Αναβολή
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setSelectedClassForStatus(classItem);
                          setStatusDialogOpen(true);
                        }}
                        disabled={saving}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Ακύρωση
                      </Button>
                    </>
                  )}
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteClass(classItem.id)}
                    disabled={saving}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Day of Week</Label>
                  <Select
                    value={classItem.day_of_week.toString()}
                    onValueChange={(value) => updateClassField(classItem.id, 'day_of_week', parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {daysOfWeek.map((day, idx) => (
                        <SelectItem key={idx} value={idx.toString()}>
                          {day}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Time</Label>
                  <Input
                    type="time"
                    value={classItem.time}
                    onChange={(e) => updateClassField(classItem.id, 'time', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Duration (minutes)</Label>
                  <Input
                    type="number"
                    min="15"
                    step="15"
                    value={classItem.duration_minutes}
                    onChange={(e) => updateClassField(classItem.id, 'duration_minutes', parseInt(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Max Capacity</Label>
                  <Input
                    type="number"
                    min="1"
                    value={classItem.max_capacity}
                    onChange={(e) => updateClassField(classItem.id, 'max_capacity', parseInt(e.target.value))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={classItem.description || ''}
                  onChange={(e) => updateClassField(classItem.id, 'description', e.target.value)}
                  placeholder="Describe what students can expect from this class..."
                  rows={3}
                />
              </div>

              <Button
                onClick={() => handleUpdateClass(classItem)}
                disabled={saving}
                className="w-full"
              >
                {saving ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
                ) : (
                  <><Save className="h-4 w-4 mr-2" /> Save Changes</>
                )}
              </Button>
            </CardContent>
          </Card>
        ))}

        {classes.length === 0 && (
          <Card className="bg-gradient-card border-border">
            <CardContent className="pt-6 text-center text-muted-foreground">
              <p>No classes created yet. Click "Add New Class" to get started.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Status Change Dialog */}
      <AlertDialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedClassForStatus?.status === 'active' ? 'Αλλαγή Κατάστασης Μαθήματος' : 'Ενημέρωση'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedClassForStatus && (
                <div className="space-y-4 pt-4">
                  <p>
                    Θέλετε να αλλάξετε την κατάσταση του μαθήματος{' '}
                    <strong>{selectedClassForStatus.name}</strong>;
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="reason">Λόγος (προαιρετικός)</Label>
                    <Textarea
                      id="reason"
                      value={statusChangeReason}
                      onChange={(e) => setStatusChangeReason(e.target.value)}
                      placeholder="π.χ. Ασθένεια γυμναστή, τεχνικά προβλήματα..."
                      rows={3}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Όλοι οι εγγεγραμμένοι θα ειδοποιηθούν αυτόματα μέσω email.
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setStatusChangeReason('');
              setSelectedClassForStatus(null);
            }}>
              Ακύρωση
            </AlertDialogCancel>
            <Button
              variant="outline"
              onClick={() => {
                if (selectedClassForStatus) {
                  handleChangeClassStatus(selectedClassForStatus, 'postponed');
                }
              }}
              disabled={saving}
            >
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Pause className="h-4 w-4 mr-2" />}
              Αναβολή
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedClassForStatus) {
                  handleChangeClassStatus(selectedClassForStatus, 'cancelled');
                }
              }}
              disabled={saving}
            >
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />}
              Ακύρωση Μαθήματος
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Schedule Dialog */}
      <Dialog open={isEditScheduleDialogOpen} onOpenChange={setIsEditScheduleDialogOpen}>
        <DialogContent className="max-w-lg w-[calc(100vw-1.5rem)] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Επεξεργασία Προγράμματος</DialogTitle>
            <DialogDescription>
              {editingClass?.name} - Προσθέστε ή αφαιρέστε ημέρες και ώρες
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <Label>Χρονοθυρίδες</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditingSchedules([...editingSchedules, { day_of_week: 1, time: '' }])}
              >
                <Plus className="h-4 w-4 mr-1" /> Προσθήκη
              </Button>
            </div>
            
            {editingSchedules.map((schedule, index) => (
              <div key={index} className="flex gap-2 items-end">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Ημέρα</Label>
                  <Select
                    value={schedule.day_of_week.toString()}
                    onValueChange={(value) => {
                      const updated = [...editingSchedules];
                      updated[index].day_of_week = parseInt(value);
                      setEditingSchedules(updated);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {daysOfWeek.map((day, idx) => (
                        <SelectItem key={idx} value={idx.toString()}>
                          {day}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Ώρα</Label>
                  <Input
                    type="time"
                    value={schedule.time}
                    onChange={(e) => {
                      const updated = [...editingSchedules];
                      updated[index].time = e.target.value;
                      setEditingSchedules(updated);
                    }}
                  />
                </div>
                {editingSchedules.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      const updated = editingSchedules.filter((_, i) => i !== index);
                      setEditingSchedules(updated);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditScheduleDialogOpen(false);
                  setEditingClass(null);
                  setEditingSchedules([]);
                }}
                className="flex-1"
              >
                Ακύρωση
              </Button>
              <Button
                onClick={handleSaveSchedules}
                disabled={saving}
                className="flex-1"
              >
                {saving ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Αποθήκευση...</>
                ) : (
                  <><Save className="h-4 w-4 mr-2" /> Αποθήκευση</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}