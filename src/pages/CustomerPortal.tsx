import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Clock, List, CalendarDays, Users, Search } from 'lucide-react';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebarCustomer } from "@/components/app-sidebar-customer";
import BookingCalendar from '@/components/BookingCalendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookingModal } from '@/components/BookingModal';
import { Badge } from '@/components/ui/badge';

interface Booking {
  id: string;
  class_id?: string;
  booking_date: string;
  status: string;
  class: {
    name: string;
    time: string;
    duration_minutes: number;
  };
}

interface ClassSchedule {
  id: string;
  day_of_week: number;
  time: string;
}

interface Class {
  id: string;
  name: string;
  description: string;
  time: string;
  day_of_week: number;
  duration_minutes: number;
  max_capacity: number;
  status: string;
  specific_date?: string | null;
  schedules?: ClassSchedule[];
}

export default function CustomerPortal() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [allBookings, setAllBookings] = useState<{ class_id: string; booking_date: string; status: string }[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  useEffect(() => {
    const loadData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
        loadBookings(session.user.id);
        loadClasses();
        loadAllBookings();
      }
    };

    loadData();
  }, []);

  const loadBookings = async (userId: string) => {
    const { data } = await supabase
      .from('bookings')
      .select(`
        id,
        class_id,
        booking_date,
        status,
        class:classes(name, time, duration_minutes)
      `)
      .eq('user_id', userId)
      .order('booking_date', { ascending: true });

    if (data) {
      setBookings(data);
    }
  };

  const loadClasses = async () => {
    try {
      // Load classes with their schedules
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select('*')
        .eq('status', 'active')
        .order('day_of_week')
        .order('time');

      if (classesError) throw classesError;

      // Load all schedules
      const { data: schedulesData, error: schedulesError } = await supabase
        .from('class_schedules')
        .select('*');

      if (schedulesError) throw schedulesError;

      // Combine classes with their schedules
      if (classesData) {
        const classesWithSchedules = classesData.map(cls => ({
          ...cls,
          schedules: schedulesData?.filter(s => s.class_id === cls.id) || []
        }));
        setClasses(classesWithSchedules);
      }
    } catch (error: any) {
      toast({
        title: 'Error loading classes',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const loadAllBookings = async () => {
    // Load all bookings (not just user's) to calculate available spots
    const { data } = await supabase
      .from('bookings')
      .select('class_id, booking_date, status')
      .in('status', ['confirmed', 'pending']);

    if (data) {
      setAllBookings(data);
    }
  };

  const getBookedCount = (classId: string, dateStr: string) => {
    return allBookings.filter(b => 
      b.class_id === classId && 
      b.booking_date === dateStr &&
      (b.status === 'confirmed' || b.status === 'pending')
    ).length;
  };

  const handleBookClass = (classItem: Class) => {
    setSelectedClass(classItem);
    setIsBookingModalOpen(true);
  };

  const handleCancelBooking = async (bookingId: string) => {
    const { error } = await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', bookingId);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Booking cancelled successfully' });
      setSelectedBooking(null);
      if (user) loadBookings(user.id);
    }
  };

  // Generate calendar events from bookings
  const bookingEvents = bookings.map(booking => {
    const bookingDate = new Date(booking.booking_date);
    const [hours, minutes] = booking.class.time.split(':').map(Number);
    const startTime = new Date(bookingDate);
    startTime.setHours(hours, minutes, 0);
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + booking.class.duration_minutes);

    return {
      id: booking.id,
      title: `${booking.class.name} (${booking.status === 'confirmed' ? 'Επιβεβαιωμένη' : booking.status === 'pending' ? 'Αναμονή' : booking.status})`,
      start: startTime,
      end: endTime,
      resource: { ...booking, type: 'booking' },
      status: booking.status,
    };
  });

  // Generate calendar events from available classes
  const generateClassEvents = () => {
    const events: any[] = [];
    const today = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 2); // Show classes for next 2 months

    classes.forEach(cls => {
      if (cls.specific_date) {
        // One-time class with specific date
        const classDate = new Date(cls.specific_date);
        const [hours, minutes] = cls.time.split(':').map(Number);
        const startTime = new Date(classDate);
        startTime.setHours(hours, minutes, 0);
        const endTime = new Date(startTime);
        endTime.setMinutes(endTime.getMinutes() + cls.duration_minutes);

        // Check if already booked by user
        const isBooked = bookings.some(b => 
          b.class_id === cls.id && 
          b.booking_date === cls.specific_date &&
          (b.status === 'confirmed' || b.status === 'pending')
        );

        if (!isBooked && startTime >= today) {
          const bookedCount = getBookedCount(cls.id, cls.specific_date);
          const availableSpots = cls.max_capacity - bookedCount;
          
          events.push({
            id: `class-${cls.id}-${cls.specific_date}`,
            title: `📅 ${cls.name} (${availableSpots}/${cls.max_capacity})`,
            start: startTime,
            end: endTime,
            resource: { ...cls, type: 'class', eventDate: cls.specific_date, availableSpots },
            status: availableSpots > 0 ? 'available' : 'full',
          });
        }
      } else if (cls.schedules && cls.schedules.length > 0) {
        // Use multiple schedules from class_schedules table
        cls.schedules.forEach(schedule => {
          let currentDate = new Date(today);
          while (currentDate <= endDate) {
            if (currentDate.getDay() === schedule.day_of_week) {
              const dateStr = currentDate.toISOString().split('T')[0];
              const [hours, minutes] = schedule.time.split(':').map(Number);
              const startTime = new Date(currentDate);
              startTime.setHours(hours, minutes, 0);
              const endTime = new Date(startTime);
              endTime.setMinutes(endTime.getMinutes() + cls.duration_minutes);

              // Check if already booked by user
              const isBooked = bookings.some(b => 
                b.class_id === cls.id && 
                b.booking_date === dateStr &&
                (b.status === 'confirmed' || b.status === 'pending')
              );

              if (!isBooked) {
                const bookedCount = getBookedCount(cls.id, dateStr);
                const availableSpots = cls.max_capacity - bookedCount;
                
                events.push({
                  id: `class-${cls.id}-${schedule.id}-${dateStr}`,
                  title: `📅 ${cls.name} (${availableSpots}/${cls.max_capacity})`,
                  start: startTime,
                  end: endTime,
                  resource: { ...cls, type: 'class', eventDate: dateStr, scheduleTime: schedule.time, availableSpots },
                  status: availableSpots > 0 ? 'available' : 'full',
                });
              }
            }
            currentDate.setDate(currentDate.getDate() + 1);
          }
        });
      } else {
        // Fallback to legacy day_of_week/time from class itself
        let currentDate = new Date(today);
        while (currentDate <= endDate) {
          if (currentDate.getDay() === cls.day_of_week) {
            const dateStr = currentDate.toISOString().split('T')[0];
            const [hours, minutes] = cls.time.split(':').map(Number);
            const startTime = new Date(currentDate);
            startTime.setHours(hours, minutes, 0);
            const endTime = new Date(startTime);
            endTime.setMinutes(endTime.getMinutes() + cls.duration_minutes);

            // Check if already booked by user
            const isBooked = bookings.some(b => 
              b.class_id === cls.id && 
              b.booking_date === dateStr &&
              (b.status === 'confirmed' || b.status === 'pending')
            );

            if (!isBooked) {
              const bookedCount = getBookedCount(cls.id, dateStr);
              const availableSpots = cls.max_capacity - bookedCount;
              
              events.push({
                id: `class-${cls.id}-${dateStr}`,
                title: `📅 ${cls.name} (${availableSpots}/${cls.max_capacity})`,
                start: startTime,
                end: endTime,
                resource: { ...cls, type: 'class', eventDate: dateStr, availableSpots },
                status: availableSpots > 0 ? 'available' : 'full',
              });
            }
          }
          currentDate.setDate(currentDate.getDate() + 1);
        }
      }
    });

    return events;
  };

  const calendarEvents = [...bookingEvents, ...generateClassEvents()];

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebarCustomer />
        
        <div className="flex-1">
          <header className="h-16 border-b border-border flex items-center px-6">
            <SidebarTrigger />
            <h1 className="ml-4 text-2xl font-bold">{t('booking.myBookings')}</h1>
          </header>

          <main className="p-6">
            <div className="max-w-6xl mx-auto">
              <Card className="bg-gradient-card border-border mb-6">
                <CardHeader>
                  <CardTitle>Welcome, {user?.user_metadata?.full_name || user?.email}</CardTitle>
                  <CardDescription>Manage your bookings and profile</CardDescription>
                </CardHeader>
              </Card>

              <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {classes.length === 0 ? (
                      <Card className="bg-gradient-card border-border col-span-full">
                        <CardContent className="pt-6">
                          <p className="text-center text-muted-foreground">No classes available yet</p>
                        </CardContent>
                      </Card>
                    ) : (
                      classes.map((cls) => (
                        <Card key={cls.id} className="bg-gradient-card border-border">
                          <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                              <span>{cls.name}</span>
                              <Badge variant="outline" className="bg-primary/20 text-primary border-primary">
                                {daysOfWeek[cls.day_of_week]}
                              </Badge>
                            </CardTitle>
                            <CardDescription>
                              <div className="flex flex-col gap-2 mt-2">
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-primary" />
                                  <span>{cls.time} ({cls.duration_minutes} min)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Users className="h-4 w-4 text-primary" />
                                  <span>Max {cls.max_capacity} people</span>
                                </div>
                              </div>
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {cls.description && (
                              <p className="text-sm text-muted-foreground">{cls.description}</p>
                            )}
                            <Button 
                              onClick={() => handleBookClass(cls)}
                              className="w-full"
                            >
                              <Calendar className="h-4 w-4 mr-2" />
                              Book This Class
                            </Button>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* Booking Modal */}
      {selectedClass && (
        <BookingModal
          isOpen={isBookingModalOpen}
          onClose={() => {
            setIsBookingModalOpen(false);
            setSelectedClass(null);
            if (user) loadBookings(user.id);
          }}
          classItem={{
            id: selectedClass.id,
            name: selectedClass.name,
            description: selectedClass.description,
            time: selectedClass.time,
            day_of_week: selectedClass.day_of_week,
            duration_minutes: selectedClass.duration_minutes,
            max_capacity: selectedClass.max_capacity,
          }}
          userId={user?.id}
          preSelectedDate={selectedClass.specific_date}
        />
      )}
    </SidebarProvider>
  );
}
