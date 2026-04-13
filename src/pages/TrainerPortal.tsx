import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Users, List, CalendarDays, BarChart3, MessageSquare } from 'lucide-react';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebarTrainer } from "@/components/app-sidebar-trainer";
import BookingCalendar from '@/components/BookingCalendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrainerStats } from '@/components/trainer/TrainerStats';
import { TrainerClassDetails } from '@/components/trainer/TrainerClassDetails';
import { TrainerMessaging } from '@/components/trainer/TrainerMessaging';
import { TrainerClassManager } from '@/components/trainer/TrainerClassManager';
import { TrainerCalendarWithDnD } from '@/components/trainer/TrainerCalendarWithDnD';

interface Class {
  id: string;
  name: string;
  time: string;
  duration_minutes: number;
  day_of_week: number;
  max_capacity: number;
  description: string;
  trainer_id: string;
}

interface BookingCount {
  class_id: string;
  count: number;
}

export default function TrainerPortal() {
  const { t } = useLanguage();
  const [user, setUser] = useState<any>(null);
  const [classes, setClasses] = useState<Class[]>([]);
  const [bookingCounts, setBookingCounts] = useState<Record<string, number>>({});
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [totalBookings, setTotalBookings] = useState(0);
  const [totalCapacity, setTotalCapacity] = useState(0);

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  useEffect(() => {
    const loadData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
        loadClasses(session.user.id);
      }
    };

    loadData();

    // Set up real-time subscription for bookings
    const channel = supabase
      .channel('bookings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings'
        },
        (payload) => {
          console.log('Booking change detected:', payload);
          // Reload classes and booking counts when bookings change
          supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
              loadClasses(session.user.id);
            }
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadClasses = async (trainerId: string) => {
    const { data: classData } = await supabase
      .from('classes')
      .select('*')
      .eq('trainer_id', trainerId)
      .order('day_of_week')
      .order('time');

    if (classData) {
      setClasses(classData);

      // Calculate total capacity per week (since classes repeat weekly)
      const capacity = classData.reduce((sum, cls) => sum + cls.max_capacity, 0);
      setTotalCapacity(capacity);

      // Load booking counts for each class (upcoming bookings only)
      const counts: Record<string, number> = {};
      let totalBookingsCount = 0;
      const today = new Date().toISOString().split('T')[0];
      
      for (const cls of classData) {
        // Get all future and today's confirmed bookings for this class
        const { data: bookingsData, error } = await supabase
          .from('bookings')
          .select('*')
          .eq('class_id', cls.id)
          .in('status', ['confirmed', 'pending'])
          .gte('booking_date', today);
        
        if (error) {
          console.error('Error loading bookings for class:', cls.name, error);
        }
        
        const classBookings = bookingsData?.length || 0;
        counts[cls.id] = classBookings;
        totalBookingsCount += classBookings;
        
        console.log(`Class "${cls.name}": ${classBookings} bookings, capacity: ${cls.max_capacity}`);
      }
      
      setBookingCounts(counts);
      setTotalBookings(totalBookingsCount);
      console.log('Total bookings across all classes:', totalBookingsCount);
    }
  };

  // Generate calendar events from classes (recurring weekly events)
  const calendarEvents = classes.flatMap(cls => {
    const events = [];
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 30); // Show 30 days back
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + 90); // Show 90 days forward

    // Generate events for each week
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      if (d.getDay() === cls.day_of_week) {
        const [hours, minutes] = cls.time.split(':').map(Number);
        const eventStart = new Date(d);
        eventStart.setHours(hours, minutes, 0);
        const eventEnd = new Date(eventStart);
        eventEnd.setMinutes(eventEnd.getMinutes() + cls.duration_minutes);

        events.push({
          id: `${cls.id}-${d.toISOString()}`,
          title: cls.name,
          start: eventStart,
          end: eventEnd,
          resource: cls,
        });
      }
    }
    return events;
  });

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebarTrainer />
        
        <div className="flex-1">
          <header className="h-16 border-b border-border flex items-center px-6">
            <SidebarTrigger />
            <h1 className="ml-4 text-2xl font-bold">{t('trainer.schedule')}</h1>
          </header>

          <main className="p-6">
            <div className="max-w-7xl mx-auto space-y-6">
              <Card className="bg-gradient-card border-border">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Welcome, {user?.user_metadata?.full_name || user?.email}</CardTitle>
                      <CardDescription>Your training dashboard - updates in real-time</CardDescription>
                    </div>
                    <Badge variant="outline" className="bg-success/20 text-success border-success">
                      <span className="relative flex h-2 w-2 mr-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
                      </span>
                      Live
                    </Badge>
                  </div>
                </CardHeader>
              </Card>

              {/* Statistics Dashboard */}
              {user && <TrainerStats trainerId={user.id} />}

              <Tabs defaultValue="overview" className="space-y-4">
                <TabsList className="grid w-full max-w-4xl grid-cols-6">
                  <TabsTrigger value="overview" className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="manage" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Manage
                  </TabsTrigger>
                  <TabsTrigger value="details" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Details
                  </TabsTrigger>
                  <TabsTrigger value="messaging" className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Messaging
                  </TabsTrigger>
                  <TabsTrigger value="schedule" className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    Schedule (DnD)
                  </TabsTrigger>
                  <TabsTrigger value="list" className="flex items-center gap-2">
                    <List className="h-4 w-4" />
                    Classes
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  <div className="grid gap-6">
                    {classes.map((cls) => {
                      const utilization = cls.max_capacity > 0 
                        ? ((bookingCounts[cls.id] || 0) / cls.max_capacity * 100).toFixed(0)
                        : 0;
                      
                      return (
                        <Card key={cls.id} className="bg-gradient-card border-border">
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <div>
                                <CardTitle>{cls.name}</CardTitle>
                                <CardDescription>
                                  {daysOfWeek[cls.day_of_week]} at {cls.time}
                                </CardDescription>
                              </div>
                              <Badge 
                                variant="outline" 
                                className={`text-lg px-4 py-2 ${
                                  Number(utilization) >= 80 
                                    ? 'bg-green-500/20 text-green-600 border-green-500'
                                    : Number(utilization) >= 50
                                    ? 'bg-amber-500/20 text-amber-600 border-amber-500'
                                    : 'bg-red-500/20 text-red-600 border-red-500'
                                }`}
                              >
                                {utilization}% Full
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Users className="h-5 w-5 text-primary" />
                                  <span className="text-lg">
                                    {bookingCounts[cls.id] || 0} / {cls.max_capacity} booked
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Clock className="h-5 w-5 text-primary" />
                                  <span className="text-sm text-muted-foreground">
                                    {cls.duration_minutes} min
                                  </span>
                                </div>
                              </div>
                              <div className="w-full bg-muted rounded-full h-3">
                                <div 
                                  className={`h-3 rounded-full transition-all ${
                                    Number(utilization) >= 80 
                                      ? 'bg-green-500'
                                      : Number(utilization) >= 50
                                      ? 'bg-amber-500'
                                      : 'bg-red-500'
                                  }`}
                                  style={{ width: `${utilization}%` }}
                                />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </TabsContent>

                <TabsContent value="manage" className="space-y-4">
                  {user && (
                    <TrainerClassManager 
                      trainerId={user.id}
                      onClassesChange={() => loadClasses(user.id)}
                    />
                  )}
                </TabsContent>

                <TabsContent value="details" className="space-y-4">
                  {classes.length === 0 ? (
                    <Card className="bg-gradient-card border-border">
                      <CardContent className="pt-6">
                        <p className="text-center text-muted-foreground">No classes assigned yet</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-6">
                      {classes.map((cls) => (
                        <TrainerClassDetails
                          key={cls.id}
                          classId={cls.id}
                          className={cls.name}
                          classTime={cls.time}
                          classDay={cls.day_of_week}
                          maxCapacity={cls.max_capacity}
                        />
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="messaging" className="space-y-4">
                  {user && (
                    <TrainerMessaging 
                      trainerId={user.id}
                      classes={classes}
                    />
                  )}
                </TabsContent>

                <TabsContent value="schedule" className="space-y-4">
                  {user && (
                    <TrainerCalendarWithDnD 
                      trainerId={user.id}
                      classes={classes}
                      onClassesChange={() => loadClasses(user.id)}
                    />
                  )}
                </TabsContent>

                <TabsContent value="list" className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {classes.length === 0 ? (
                  <Card className="bg-gradient-card border-border col-span-full">
                    <CardContent className="pt-6">
                      <p className="text-center text-muted-foreground">No classes assigned yet</p>
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
                              <span>{bookingCounts[cls.id] || 0} / {cls.max_capacity} booked</span>
                            </div>
                          </div>
                        </CardDescription>
                      </CardHeader>
                      {cls.description && (
                        <CardContent>
                          <p className="text-sm text-muted-foreground">{cls.description}</p>
                        </CardContent>
                      )}
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
