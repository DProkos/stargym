import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Save, Trash2, Clock, Users, Calendar, XCircle, Pause } from 'lucide-react';
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
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedClassForStatus, setSelectedClassForStatus] = useState<Class | null>(null);
  const [statusChangeReason, setStatusChangeReason] = useState('');
  const [trainerName, setTrainerName] = useState('');
  const { toast } = useToast();

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // New class form state
  const [newClass, setNewClass] = useState({
    name: '',
    description: '',
    time: '',
    day_of_week: 1,
    duration_minutes: 60,
    max_capacity: 20,
    specific_date: '',
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
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('trainer_id', trainerId)
        .order('day_of_week')
        .order('time');

      if (error) throw error;

      if (data) {
        // Type assertion for status field
        const typedClasses = data.map(cls => ({
          ...cls,
          status: cls.status as 'active' | 'cancelled' | 'postponed'
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
    if (!newClass.name || !newClass.time) {
      toast({
        title: 'Missing information',
        description: 'Please fill in class name and time',
        variant: 'destructive',
      });
      return;
    }

    // If specific_date is set, calculate day_of_week from it
    let dayOfWeek = newClass.day_of_week;
    if (newClass.specific_date) {
      dayOfWeek = new Date(newClass.specific_date).getDay();
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('classes')
        .insert({
          name: newClass.name,
          description: newClass.description,
          time: newClass.time,
          day_of_week: dayOfWeek,
          duration_minutes: newClass.duration_minutes,
          max_capacity: newClass.max_capacity,
          specific_date: newClass.specific_date || null,
          trainer_id: trainerId,
        });

      if (error) throw error;

      toast({
        title: 'Class created',
        description: 'Your class has been added successfully',
      });

      setIsDialogOpen(false);
      setNewClass({
        name: '',
        description: '',
        time: '',
        day_of_week: 1,
        duration_minutes: 60,
        max_capacity: 20,
        specific_date: '',
      });
      
      loadClasses();
      if (onClassesChange) onClassesChange();
    } catch (error: any) {
      toast({
        title: 'Error creating class',
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
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold">Manage Your Classes</h3>
          <p className="text-muted-foreground">Create and edit your training classes</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add New Class
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
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

              <div className="space-y-2">
                <Label htmlFor="new-specific-date">Συγκεκριμένη Ημερομηνία (προαιρετικό)</Label>
                <Input
                  id="new-specific-date"
                  type="date"
                  value={newClass.specific_date}
                  onChange={(e) => setNewClass({ ...newClass, specific_date: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Αν επιλέξετε ημερομηνία, το μάθημα θα γίνει μόνο εκείνη τη μέρα. Αλλιώς θα επαναλαμβάνεται εβδομαδιαία.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="new-day">Ημέρα Εβδομάδας {newClass.specific_date ? '(αυτόματα)' : '*'}</Label>
                  <Select
                    value={newClass.specific_date 
                      ? new Date(newClass.specific_date).getDay().toString() 
                      : newClass.day_of_week.toString()}
                    onValueChange={(value) => setNewClass({ ...newClass, day_of_week: parseInt(value) })}
                    disabled={!!newClass.specific_date}
                  >
                    <SelectTrigger id="new-day">
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
                  <Label htmlFor="new-time">Ώρα *</Label>
                  <Input
                    id="new-time"
                    type="time"
                    value={newClass.time}
                    onChange={(e) => setNewClass({ ...newClass, time: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="new-duration">Duration (minutes)</Label>
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
                  <Label htmlFor="new-capacity">Max Capacity</Label>
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
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating...</>
                ) : (
                  <><Plus className="h-4 w-4 mr-2" /> Create Class</>
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
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-3">
                    <Input
                      value={classItem.name}
                      onChange={(e) => updateClassField(classItem.id, 'name', e.target.value)}
                      className="text-xl font-bold h-auto border-0 p-0 bg-transparent focus-visible:ring-0"
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
                    <Badge variant="outline" className="bg-primary/20 text-primary border-primary">
                      <Calendar className="h-3 w-3 mr-1" />
                      {daysOfWeek[classItem.day_of_week]}
                    </Badge>
                    <Badge variant="outline">
                      <Clock className="h-3 w-3 mr-1" />
                      {classItem.time}
                    </Badge>
                    <Badge variant="outline">
                      {classItem.duration_minutes} min
                    </Badge>
                    <Badge variant="outline">
                      <Users className="h-3 w-3 mr-1" />
                      Max {classItem.max_capacity}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-2">
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
              <div className="grid grid-cols-2 gap-4">
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

              <div className="grid grid-cols-2 gap-4">
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
    </div>
  );
}