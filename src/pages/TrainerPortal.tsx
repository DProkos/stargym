import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Users, List, CalendarDays } from 'lucide-react';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebarTrainer } from "@/components/app-sidebar-trainer";
import BookingCalendar from '@/components/BookingCalendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Class {
  id: string;
  name: string;
  time: string;
  duration_minutes: number;
  day_of_week: number;
  max_capacity: number;
  description: string;
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

      // Load booking counts for each class
      const counts: Record<string, number> = {};
      for (const cls of classData) {
        const { count } = await supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .eq('class_id', cls.id)
          .eq('status', 'confirmed');
        
        counts[cls.id] = count || 0;
      }
      setBookingCounts(counts);
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
            <div className="max-w-6xl mx-auto">
              <Card className="bg-gradient-card border-border mb-6">
                <CardHeader>
                  <CardTitle>Welcome, {user?.user_metadata?.full_name || user?.email}</CardTitle>
                  <CardDescription>Your assigned classes and schedule</CardDescription>
                </CardHeader>
              </Card>

              <Tabs defaultValue="calendar" className="space-y-4">
                <TabsList className="grid w-full max-w-md grid-cols-2">
                  <TabsTrigger value="calendar" className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    Calendar View
                  </TabsTrigger>
                  <TabsTrigger value="list" className="flex items-center gap-2">
                    <List className="h-4 w-4" />
                    Class List
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="calendar" className="space-y-4">
                  <BookingCalendar 
                    events={calendarEvents}
                    onSelectEvent={(event) => setSelectedClass(event.resource)}
                    defaultView="week"
                  />
                  
                  {selectedClass && (
                    <Card className="bg-gradient-card border-border">
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span>{selectedClass.name}</span>
                          <Badge variant="outline" className="bg-primary/20 text-primary border-primary">
                            {daysOfWeek[selectedClass.day_of_week]}
                          </Badge>
                        </CardTitle>
                        <CardDescription>
                          <div className="flex flex-col gap-2 mt-2">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-primary" />
                              <span>{selectedClass.time} ({selectedClass.duration_minutes} min)</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-primary" />
                              <span>{bookingCounts[selectedClass.id] || 0} / {selectedClass.max_capacity} booked</span>
                            </div>
                          </div>
                        </CardDescription>
                      </CardHeader>
                      {selectedClass.description && (
                        <CardContent>
                          <p className="text-sm text-muted-foreground mb-4">{selectedClass.description}</p>
                          <button 
                            onClick={() => setSelectedClass(null)}
                            className="text-sm text-primary hover:underline"
                          >
                            Close
                          </button>
                        </CardContent>
                      )}
                    </Card>
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
