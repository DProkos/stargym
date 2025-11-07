import { useState, useEffect, useMemo, useCallback } from 'react';
import { Calendar as BigCalendar, momentLocalizer, View } from 'react-big-calendar';
import withDragAndDrop, { EventInteractionArgs } from 'react-big-calendar/lib/addons/dragAndDrop';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
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
    setPendingMove({ event, newStart: start, newEnd: end });
  }, []);

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
  }, [trainerId, toast, onClassesChange]);

  const eventStyleGetter = () => {
    return {
      style: {
        backgroundColor: 'hsl(var(--primary))',
        borderColor: 'hsl(var(--primary))',
        color: 'white',
        borderRadius: '6px',
        border: '3px solid hsl(var(--primary))',
        fontSize: '0.875rem',
        fontWeight: '600',
        padding: '6px 10px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
        minHeight: '50px',
        display: 'flex',
        alignItems: 'center',
        cursor: 'move',
      },
    };
  };

  return (
    <>
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="mb-4 p-3 bg-primary/10 border border-primary/30 rounded-lg">
            <p className="text-sm font-medium text-primary">
              💡 <strong>Drag & Drop:</strong> Σύρετε τις τάξεις σας για να τις μετακινήσετε σε διαφορετική ημέρα/ώρα. 
              Τραβήξτε τις άκρες για να αλλάξετε τη διάρκεια.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Σημείωση: Οι αλλαγές επηρεάζουν όλες τις μελλοντικές εμφανίσεις της τάξης.
            </p>
          </div>

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
            views={['month', 'week', 'day']}
            step={30}
            timeslots={2}
            showMultiDayTimes
            defaultDate={new Date()}
            onEventDrop={handleEventDrop}
            onEventResize={handleEventResize}
            resizable
            draggableAccessor={() => true}
            tooltipAccessor={(event: ClassEvent) => 
              `${event.title} - Drag για μετακίνηση`
            }
          />
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
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
