import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Users } from 'lucide-react';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebarTrainer } from "@/components/app-sidebar-trainer";

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
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
