import { useState, useEffect, useMemo, useCallback } from 'react';
import { Calendar as BigCalendar, momentLocalizer, View } from 'react-big-calendar';
import withDragAndDrop, { EventInteractionArgs } from 'react-big-calendar/lib/addons/dragAndDrop';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CheckSquare, Square, Move, Clock, Trash2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import '../calendar-styles.css';

const localizer = momentLocalizer(moment);
const DragAndDropCalendar = withDragAndDrop(BigCalendar);

interface ClassItem {
  id: string;
  name: string;
  description: string;
  duration_minutes: number;
  max_capacity: number;
  day_of_week: number;
  time: string;
  trainer_id: string;
}

interface ClassEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: ClassItem;
}

interface PendingMove {
  event: ClassEvent;
  newStart: Date;
  newEnd: Date;
}

interface BulkEditOptions {
  dayOfWeek?: number;
  timeOffset?: number; // minutes to add/subtract
  newTime?: string;
  durationChange?: number; // minutes to add/subtract
}

interface TrainerCalendarWithDnDProps {
  trainerId: string;
  classes: ClassItem[];
  onClassesChange: () => void;
}

export const TrainerCalendarWithDnD = ({ trainerId, classes, onClassesChange }: TrainerCalendarWithDnDProps) => {
  const { toast } = useToast();
  const [view, setView] = useState<View>('week');
  const [date, setDate] = useState(new Date());
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [selectedClassIds, setSelectedClassIds] = useState<Set<string>>(new Set());
  const [showBulkEditDialog, setShowBulkEditDialog] = useState(false);
  const [bulkEditOptions, setBulkEditOptions] = useState<BulkEditOptions>({});

  // Generate calendar events from classes (recurring weekly events)
  const events = useMemo(() => {
    const calendarEvents: ClassEvent[] = [];
    const startDate = moment().subtract(1, 'week').startOf('week');
    const endDate = moment().add(4, 'weeks').endOf('week');

    classes.forEach((classItem) => {
      let currentDate = moment(startDate);
      
      while (currentDate.isBefore(endDate)) {
        if (currentDate.day() === classItem.day_of_week) {
          const [hours, minutes] = classItem.time.split(':').map(Number);
          const eventStart = currentDate.clone().hours(hours).minutes(minutes).toDate();
          const eventEnd = moment(eventStart).add(classItem.duration_minutes, 'minutes').toDate();
          
          calendarEvents.push({
            id: `${classItem.id}-${currentDate.format('YYYY-MM-DD')}`,
            title: classItem.name,
            start: eventStart,
            end: eventEnd,
            resource: classItem,
          });
        }
        currentDate.add(1, 'day');
      }
    });

    return calendarEvents;
  }, [classes]);

  const handleEventDrop = useCallback(async ({ event, start, end }: EventInteractionArgs<ClassEvent>) => {
    if (bulkEditMode) return; // Disable drag in bulk edit mode
    setPendingMove({ event, newStart: start, newEnd: end });
  }, [bulkEditMode]);

  const confirmMove = async () => {
    if (!pendingMove) return;

    const { event, newStart, newEnd } = pendingMove;
    const classItem = event.resource;

    // Calculate new day_of_week and time
    const newDayOfWeek = moment(newStart).day();
    const newTime = moment(newStart).format('HH:mm:ss');
    const newDuration = moment(newEnd).diff(moment(newStart), 'minutes');

    try {
      const { error } = await supabase
        .from('classes')
        .update({
          day_of_week: newDayOfWeek,
          time: newTime,
          duration_minutes: newDuration,
        })
        .eq('id', classItem.id)
        .eq('trainer_id', trainerId);

      if (error) throw error;

      toast({
        title: 'Επιτυχής Μετακίνηση',
        description: `Η τάξη "${classItem.name}" μετακινήθηκε. Όλες οι μελλοντικές εμφανίσεις ενημερώθηκαν.`,
      });

      onClassesChange();
    } catch (error: any) {
      console.error('Error moving class:', error);
      toast({
        title: 'Σφάλμα',
        description: error.message || 'Αποτυχία μετακίνησης τάξης',
        variant: 'destructive',
      });
    } finally {
      setPendingMove(null);
    }
  };

  const handleEventResize = useCallback(async ({ event, start, end }: EventInteractionArgs<ClassEvent>) => {
    if (bulkEditMode) return; // Disable resize in bulk edit mode
    
    const classItem = event.resource;
    const newDuration = moment(end).diff(moment(start), 'minutes');

    try {
      const { error } = await supabase
        .from('classes')
        .update({
          duration_minutes: newDuration,
        })
        .eq('id', classItem.id)
        .eq('trainer_id', trainerId);

      if (error) throw error;

      toast({
        title: 'Επιτυχής Αλλαγή Διάρκειας',
        description: `Η διάρκεια της τάξης "${classItem.name}" ενημερώθηκε σε ${newDuration} λεπτά.`,
      });

      onClassesChange();
    } catch (error: any) {
      console.error('Error resizing class:', error);
      toast({
        title: 'Σφάλμα',
        description: error.message || 'Αποτυχία αλλαγής διάρκειας',
        variant: 'destructive',
      });
    }
  }, [trainerId, toast, onClassesChange, bulkEditMode]);

  const toggleClassSelection = (classId: string) => {
    const newSelected = new Set(selectedClassIds);
    if (newSelected.has(classId)) {
      newSelected.delete(classId);
    } else {
      newSelected.add(classId);
    }
    setSelectedClassIds(newSelected);
  };

  const selectAllClasses = () => {
    const allIds = new Set(classes.map(c => c.id));
    setSelectedClassIds(allIds);
  };

  const deselectAllClasses = () => {
    setSelectedClassIds(new Set());
  };

  const handleBulkEdit = () => {
    if (selectedClassIds.size === 0) {
      toast({
        title: 'Καμία Επιλογή',
        description: 'Παρακαλώ επιλέξτε τουλάχιστον μία τάξη',
        variant: 'destructive',
      });
      return;
    }
    setShowBulkEditDialog(true);
  };

  const applyBulkEdit = async () => {
    if (selectedClassIds.size === 0) return;

    try {
      const selectedClasses = classes.filter(c => selectedClassIds.has(c.id));
      const updates = selectedClasses.map(cls => {
        const update: any = { id: cls.id };

        // Apply day of week change
        if (bulkEditOptions.dayOfWeek !== undefined) {
          update.day_of_week = bulkEditOptions.dayOfWeek;
        }

        // Apply time change
        if (bulkEditOptions.newTime) {
          update.time = bulkEditOptions.newTime + ':00';
        } else if (bulkEditOptions.timeOffset) {
          const [hours, minutes] = cls.time.split(':').map(Number);
          const totalMinutes = hours * 60 + minutes + bulkEditOptions.timeOffset;
          const newHours = Math.floor(totalMinutes / 60) % 24;
          const newMinutes = totalMinutes % 60;
          update.time = `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}:00`;
        }

        // Apply duration change
        if (bulkEditOptions.durationChange) {
          update.duration_minutes = Math.max(15, cls.duration_minutes + bulkEditOptions.durationChange);
        }

        return update;
      });

      // Update all selected classes
      for (const update of updates) {
        const { id, ...data } = update;
        const { error } = await supabase
          .from('classes')
          .update(data)
          .eq('id', id)
          .eq('trainer_id', trainerId);

        if (error) throw error;
      }

      toast({
        title: 'Επιτυχής Μαζική Ενημέρωση',
        description: `${selectedClassIds.size} τάξεις ενημερώθηκαν επιτυχώς`,
      });

      setShowBulkEditDialog(false);
      setBulkEditOptions({});
      deselectAllClasses();
      setBulkEditMode(false);
      onClassesChange();
    } catch (error: any) {
      console.error('Error applying bulk edit:', error);
      toast({
        title: 'Σφάλμα',
        description: error.message || 'Αποτυχία μαζικής ενημέρωσης',
        variant: 'destructive',
      });
    }
  };

  const eventStyleGetter = (event: ClassEvent) => {
    const isSelected = selectedClassIds.has(event.resource.id);
    
    return {
      style: {
        backgroundColor: isSelected ? 'hsl(var(--success))' : 'hsl(var(--primary))',
        borderColor: isSelected ? 'hsl(var(--success))' : 'hsl(var(--primary))',
        color: 'white',
        borderRadius: '6px',
        border: `3px solid ${isSelected ? 'hsl(var(--success))' : 'hsl(var(--primary))'}`,
        fontSize: '0.875rem',
        fontWeight: '600',
        padding: '6px 10px',
        boxShadow: isSelected ? '0 0 12px hsl(var(--success))' : '0 2px 8px rgba(0, 0, 0, 0.3)',
        minHeight: '50px',
        display: 'flex',
        alignItems: 'center',
        cursor: bulkEditMode ? 'pointer' : 'move',
        opacity: bulkEditMode && !isSelected ? 0.6 : 1,
      },
    };
  };

  const handleSelectEvent = (event: ClassEvent) => {
    if (bulkEditMode) {
      toggleClassSelection(event.resource.id);
    }
  };

  return (
    <>
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {bulkEditMode && (
                <Badge variant="outline" className="bg-success/20 text-success border-success">
                  Bulk Edit Mode
                </Badge>
              )}
              Trainer Schedule
            </CardTitle>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Label htmlFor="bulk-mode">Bulk Edit</Label>
                <Switch
                  id="bulk-mode"
                  checked={bulkEditMode}
                  onCheckedChange={(checked) => {
                    setBulkEditMode(checked);
                    if (!checked) {
                      deselectAllClasses();
                    }
                  }}
                />
              </div>
              {bulkEditMode && selectedClassIds.size > 0 && (
                <Badge variant="outline" className="bg-primary/20 text-primary border-primary">
                  {selectedClassIds.size} επιλεγμένες
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {bulkEditMode && (
            <div className="mb-4 p-4 bg-success/10 border border-success/30 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-success flex items-center gap-2">
                    <CheckSquare className="h-4 w-4" />
                    <strong>Bulk Edit Mode Ενεργοποιημένο</strong>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Κάντε κλικ στις τάξεις για να τις επιλέξετε και στη συνέχεια εφαρμόστε μαζικές αλλαγές
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={selectAllClasses}>
                    Επιλογή Όλων
                  </Button>
                  <Button size="sm" variant="outline" onClick={deselectAllClasses}>
                    Αποεπιλογή Όλων
                  </Button>
                </div>
              </div>
              {selectedClassIds.size > 0 && (
                <Button 
                  onClick={handleBulkEdit} 
                  className="w-full"
                  variant="default"
                >
                  <Move className="h-4 w-4 mr-2" />
                  Εφαρμογή Μαζικών Αλλαγών ({selectedClassIds.size} τάξεις)
                </Button>
              )}
            </div>
          )}

          {!bulkEditMode && (
            <div className="mb-4 p-3 bg-primary/10 border border-primary/30 rounded-lg">
              <p className="text-sm font-medium text-primary">
                💡 <strong>Drag & Drop:</strong> Σύρετε τις τάξεις σας για να τις μετακινήσετε σε διαφορετική ημέρα/ώρα. 
                Τραβήξτε τις άκρες για να αλλάξετε τη διάρκεια.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Σημείωση: Οι αλλαγές επηρεάζουν όλες τις μελλοντικές εμφανίσεις της τάξης.
              </p>
            </div>
          )}

          <DragAndDropCalendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: 700, minHeight: 700 }}
            view={view}
            onView={setView}
            date={date}
            onNavigate={setDate}
            eventPropGetter={eventStyleGetter}
            onSelectEvent={handleSelectEvent}
            views={['month', 'week', 'day']}
            step={30}
            timeslots={2}
            showMultiDayTimes
            defaultDate={new Date()}
            onEventDrop={handleEventDrop}
            onEventResize={handleEventResize}
            resizable={!bulkEditMode}
            draggableAccessor={() => !bulkEditMode}
            tooltipAccessor={(event: ClassEvent) => 
              bulkEditMode 
                ? `Κλικ για επιλογή: ${event.title}` 
                : `${event.title} - Drag για μετακίνηση`
            }
          />
        </CardContent>
      </Card>

      {/* Bulk Edit Dialog */}
      <Dialog open={showBulkEditDialog} onOpenChange={setShowBulkEditDialog}>
        <DialogContent className="bg-card border-border sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Μαζική Επεξεργασία Τάξεων</DialogTitle>
            <DialogDescription>
              Εφαρμόστε αλλαγές σε {selectedClassIds.size} επιλεγμένες τάξεις
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Αλλαγή Ημέρας</Label>
              <Select
                value={bulkEditOptions.dayOfWeek?.toString() || ''}
                onValueChange={(value) => setBulkEditOptions({ ...bulkEditOptions, dayOfWeek: value ? parseInt(value) : undefined })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Επιλέξτε ημέρα (προαιρετικό)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Χωρίς αλλαγή</SelectItem>
                  <SelectItem value="1">Δευτέρα</SelectItem>
                  <SelectItem value="2">Τρίτη</SelectItem>
                  <SelectItem value="3">Τετάρτη</SelectItem>
                  <SelectItem value="4">Πέμπτη</SelectItem>
                  <SelectItem value="5">Παρασκευή</SelectItem>
                  <SelectItem value="6">Σάββατο</SelectItem>
                  <SelectItem value="0">Κυριακή</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Νέα Ώρα</Label>
              <Input
                type="time"
                value={bulkEditOptions.newTime || ''}
                onChange={(e) => setBulkEditOptions({ ...bulkEditOptions, newTime: e.target.value, timeOffset: undefined })}
                placeholder="Επιλέξτε ώρα (προαιρετικό)"
              />
            </div>

            <div className="space-y-2">
              <Label>Ή Μετακίνηση Ώρας (λεπτά)</Label>
              <Select
                value={bulkEditOptions.timeOffset?.toString() || ''}
                onValueChange={(value) => setBulkEditOptions({ ...bulkEditOptions, timeOffset: value ? parseInt(value) : undefined, newTime: undefined })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Μετακίνηση ώρας (προαιρετικό)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Χωρίς αλλαγή</SelectItem>
                  <SelectItem value="-60">-1 ώρα</SelectItem>
                  <SelectItem value="-30">-30 λεπτά</SelectItem>
                  <SelectItem value="30">+30 λεπτά</SelectItem>
                  <SelectItem value="60">+1 ώρα</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Αλλαγή Διάρκειας (λεπτά)</Label>
              <Select
                value={bulkEditOptions.durationChange?.toString() || ''}
                onValueChange={(value) => setBulkEditOptions({ ...bulkEditOptions, durationChange: value ? parseInt(value) : undefined })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Αλλαγή διάρκειας (προαιρετικό)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Χωρίς αλλαγή</SelectItem>
                  <SelectItem value="-30">-30 λεπτά</SelectItem>
                  <SelectItem value="-15">-15 λεπτά</SelectItem>
                  <SelectItem value="15">+15 λεπτά</SelectItem>
                  <SelectItem value="30">+30 λεπτά</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <p className="text-sm text-amber-500">
                ⚠️ <strong>Προσοχή:</strong> Οι αλλαγές θα επηρεάσουν όλες τις μελλοντικές εμφανίσεις των επιλεγμένων τάξεων.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkEditDialog(false)}>
              Ακύρωση
            </Button>
            <Button onClick={applyBulkEdit}>
              Εφαρμογή Αλλαγών
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Single Move Confirmation Dialog */}
      <AlertDialog open={!!pendingMove} onOpenChange={() => setPendingMove(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Επιβεβαίωση Μετακίνησης Τάξης</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Θέλετε να μετακινήσετε την τάξη <strong>"{pendingMove?.event.resource.name}"</strong>;
              </p>
              <div className="bg-muted p-3 rounded-md space-y-2">
                <div>
                  <span className="font-semibold">Παλιά Ημερομηνία/Ώρα:</span>
                  <p className="text-sm">
                    {moment(pendingMove?.event.start).format('dddd, HH:mm')}
                  </p>
                </div>
                <div>
                  <span className="font-semibold">Νέα Ημερομηνία/Ώρα:</span>
                  <p className="text-sm text-primary">
                    {moment(pendingMove?.newStart).format('dddd, HH:mm')}
                  </p>
                </div>
              </div>
              <p className="text-amber-500 font-semibold">
                ⚠️ Προσοχή: Αυτή η αλλαγή θα επηρεάσει ΟΛΕΣ τις μελλοντικές εμφανίσεις αυτής της τάξης, όχι μόνο αυτή την ημερομηνία.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Ακύρωση</AlertDialogCancel>
            <AlertDialogAction onClick={confirmMove}>
              Επιβεβαίωση Μετακίνησης
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
