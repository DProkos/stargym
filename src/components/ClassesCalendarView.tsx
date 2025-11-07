import { useState, useEffect, useMemo } from 'react';
import { Calendar as BigCalendar, momentLocalizer, View, Event } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Clock, Users, Calendar as CalendarIcon, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import './calendar-styles.css';

const localizer = momentLocalizer(moment);

interface ClassItem {
  id: string;
  name: string;
  description: string;
  duration_minutes: number;
  max_capacity: number;
  day_of_week: number;
  time: string;
  trainer: {
    name: string;
  } | null;
}

interface ClassEventResource {
  class: ClassItem;
  date: Date;
  available: number;
  booked: number;
  availabilityPercent: number;
}

interface ClassEvent {
  title: string;
  start: Date;
  end: Date;
  resource: ClassEventResource;
}

interface ClassesCalendarViewProps {
  classes: ClassItem[];
  onBookClass: (classItem: ClassItem, date: Date) => void;
}

export const ClassesCalendarView = ({ classes, onBookClass }: ClassesCalendarViewProps) => {
  const { t } = useLanguage();
  const [view, setView] = useState<View>('week');
  const [date, setDate] = useState(new Date());
  const [bookingCounts, setBookingCounts] = useState<Record<string, number>>({});
  const [selectedEvent, setSelectedEvent] = useState<ClassEvent | null>(null);

  // Generate calendar events for the next 4 weeks
  const events = useMemo(() => {
    const calendarEvents: ClassEvent[] = [];
    const startDate = moment().startOf('week');
    const endDate = moment().add(4, 'weeks').endOf('week');

    classes.forEach((classItem) => {
      let currentDate = moment(startDate);
      
      while (currentDate.isBefore(endDate)) {
        if (currentDate.day() === classItem.day_of_week) {
          const [hours, minutes] = classItem.time.split(':').map(Number);
          const eventStart = currentDate.clone().hours(hours).minutes(minutes).toDate();
          const eventEnd = moment(eventStart).add(classItem.duration_minutes, 'minutes').toDate();
          
          // Skip past dates
          if (moment(eventStart).isAfter(moment())) {
            const dateKey = `${classItem.id}-${moment(eventStart).format('YYYY-MM-DD')}`;
            const booked = bookingCounts[dateKey] || 0;
            const available = classItem.max_capacity - booked;
            const availabilityPercent = (available / classItem.max_capacity) * 100;

            calendarEvents.push({
              title: classItem.name,
              start: eventStart,
              end: eventEnd,
              resource: {
                class: classItem,
                date: eventStart,
                available,
                booked,
                availabilityPercent,
              },
            });
          }
        }
        currentDate.add(1, 'day');
      }
    });

    return calendarEvents;
  }, [classes, bookingCounts]);

  useEffect(() => {
    loadBookingCounts();
  }, [date, view]);

  const loadBookingCounts = async () => {
    const startDate = moment(date).subtract(2, 'weeks').startOf('week');
    const endDate = moment(date).add(4, 'weeks').endOf('week');

    const { data, error } = await supabase
      .from('bookings')
      .select('class_id, booking_date')
      .gte('booking_date', startDate.format('YYYY-MM-DD'))
      .lte('booking_date', endDate.format('YYYY-MM-DD'))
      .eq('status', 'confirmed');

    if (error) {
      console.error('Error loading booking counts:', error);
      return;
    }

    const counts: Record<string, number> = {};
    data?.forEach((booking) => {
      const key = `${booking.class_id}-${booking.booking_date}`;
      counts[key] = (counts[key] || 0) + 1;
    });

    setBookingCounts(counts);
  };

  const eventStyleGetter = (event: ClassEvent) => {
    const { availabilityPercent } = event.resource;
    
    let backgroundColor: string;
    let borderColor: string;
    
    if (availabilityPercent > 50) {
      // Green - plenty of spots
      backgroundColor = 'hsl(var(--calendar-high))';
      borderColor = 'hsl(var(--calendar-high))';
    } else if (availabilityPercent > 20) {
      // Amber - limited spots
      backgroundColor = 'hsl(var(--calendar-medium))';
      borderColor = 'hsl(var(--calendar-medium))';
    } else if (availabilityPercent > 0) {
      // Orange - very few spots
      backgroundColor = 'hsl(var(--calendar-low))';
      borderColor = 'hsl(var(--calendar-low))';
    } else {
      // Red - full
      backgroundColor = 'hsl(var(--calendar-full))';
      borderColor = 'hsl(var(--calendar-full))';
    }

    return {
      style: {
        backgroundColor,
        borderColor,
        color: 'white',
        borderRadius: '6px',
        border: `3px solid ${borderColor}`,
        fontSize: '0.875rem',
        fontWeight: '600',
        padding: '6px 10px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
        minHeight: '50px',
        display: 'flex',
        alignItems: 'center',
      },
    };
  };

  const handleSelectEvent = (event: ClassEvent) => {
    setSelectedEvent(event);
  };

  const getAvailabilityIcon = (percent: number) => {
    if (percent > 50) return <CheckCircle className="h-5 w-5 text-green-500" />;
    if (percent > 20) return <AlertCircle className="h-5 w-5 text-amber-500" />;
    if (percent > 0) return <AlertCircle className="h-5 w-5 text-orange-500" />;
    return <XCircle className="h-5 w-5 text-destructive" />;
  };

  const getAvailabilityText = (percent: number, available: number) => {
    if (percent > 50) return `${available} θέσεις διαθέσιμες`;
    if (percent > 20) return `${available} θέσεις απομένουν`;
    if (percent > 0) return `Μόνο ${available} ${available === 1 ? 'θέση' : 'θέσεις'} απομένουν!`;
    return 'Πλήρης - Δεν υπάρχουν διαθέσιμες θέσεις';
  };

  return (
    <>
      <div className="space-y-4">
        {/* Legend */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg">Οδηγός Χρωμάτων</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-calendar-high"></div>
                <span className="text-sm">Πολλές θέσεις (&gt;50%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-calendar-medium"></div>
                <span className="text-sm">Λίγες θέσεις (20-50%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-calendar-low"></div>
                <span className="text-sm">Ελάχιστες θέσεις (&lt;20%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-calendar-full"></div>
                <span className="text-sm">Πλήρης</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Calendar */}
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <BigCalendar
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
              min={new Date(0, 0, 0, 6, 0, 0)}
              max={new Date(0, 0, 0, 22, 0, 0)}
              tooltipAccessor={(event: ClassEvent) => 
                `${event.title} - ${event.resource.available} θέσεις διαθέσιμες`
              }
            />
          </CardContent>
        </Card>
      </div>

      {/* Event Details Dialog */}
      {selectedEvent && (
        <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
          <DialogContent className="sm:max-w-[500px] bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-2xl">{selectedEvent.resource.class.name}</DialogTitle>
              <DialogDescription>{selectedEvent.resource.class.description}</DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Availability Status */}
              <Card className={`border-2 ${
                selectedEvent.resource.availabilityPercent > 50 ? 'border-green-500' :
                selectedEvent.resource.availabilityPercent > 20 ? 'border-amber-500' :
                selectedEvent.resource.availabilityPercent > 0 ? 'border-orange-500' :
                'border-destructive'
              }`}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    {getAvailabilityIcon(selectedEvent.resource.availabilityPercent)}
                    <div>
                      <p className="font-semibold">
                        {getAvailabilityText(selectedEvent.resource.availabilityPercent, selectedEvent.resource.available)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {selectedEvent.resource.booked}/{selectedEvent.resource.class.max_capacity} κρατήσεις
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Class Details */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CalendarIcon className="h-4 w-4 text-primary" />
                  <span>{moment(selectedEvent.resource.date).format('dddd, D MMMM YYYY')}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4 text-primary" />
                  <span>{selectedEvent.resource.class.time} ({selectedEvent.resource.class.duration_minutes} λεπτά)</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-4 w-4 text-primary" />
                  <span>{selectedEvent.resource.class.max_capacity} {t('classes.capacity')}</span>
                </div>
                {selectedEvent.resource.class.trainer && (
                  <p className="text-sm">
                    <span className="text-muted-foreground">{t('classes.trainer')}:</span>{' '}
                    <span className="text-primary">{selectedEvent.resource.class.trainer.name}</span>
                  </p>
                )}
              </div>

              {/* Action Button */}
              <Button 
                className="w-full"
                onClick={() => {
                  onBookClass(selectedEvent.resource.class, selectedEvent.resource.date);
                  setSelectedEvent(null);
                }}
                disabled={selectedEvent.resource.available === 0}
              >
                {selectedEvent.resource.available === 0 ? 'Πλήρης' : t('classes.book')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};