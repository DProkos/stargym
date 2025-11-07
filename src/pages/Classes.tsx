import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Navigation } from '@/components/Navigation';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Users, Calendar, CalendarDays, List } from 'lucide-react';
import { BookingModal } from '@/components/BookingModal';
import { ChatbotWidget } from '@/components/ChatbotWidget';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClassesCalendarView } from '@/components/ClassesCalendarView';

interface Class {
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

export default function Classes() {
  const { t } = useLanguage();
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);

      if (session?.user) {
        const { data } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .eq('role', 'admin')
          .single();
        setIsAdmin(!!data);
      }
    };

    checkUser();
    loadClasses();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadClasses = async () => {
    const { data } = await supabase
      .from('classes')
      .select(`
        *,
        trainer:trainers(name)
      `)
      .order('day_of_week')
      .order('time');
    
    if (data) {
      setClasses(data);
    }
  };

  const handleBookClass = (classItem: Class, date?: Date) => {
    if (!user) {
      window.location.href = '/auth';
      return;
    }
    setSelectedClass(classItem);
    setSelectedDate(date);
    setIsBookingModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation user={user} isAdmin={isAdmin} />
      <ChatbotWidget />
      
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {t('classes.title')}
            </h1>
            <p className="text-xl text-muted-foreground">{t('classes.subtitle')}</p>
          </div>

          <Tabs defaultValue="calendar" className="space-y-6">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
              <TabsTrigger value="calendar" className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                Ημερολόγιο
              </TabsTrigger>
              <TabsTrigger value="list" className="flex items-center gap-2">
                <List className="h-4 w-4" />
                Λίστα
              </TabsTrigger>
            </TabsList>

            <TabsContent value="calendar" className="space-y-4">
              <ClassesCalendarView 
                classes={classes}
                onBookClass={handleBookClass}
              />
            </TabsContent>

            <TabsContent value="list" className="space-y-4">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {classes.map((classItem) => (
                  <Card key={classItem.id} className="bg-gradient-card border-border hover:border-primary transition-all duration-300 hover:shadow-neon">
                    <CardHeader>
                      <CardTitle className="text-2xl">{classItem.name}</CardTitle>
                      <CardDescription>{classItem.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4 text-primary" />
                        <span>{t(`day.${days[classItem.day_of_week]}`)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4 text-primary" />
                        <span>{classItem.time} ({classItem.duration_minutes} min)</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Users className="h-4 w-4 text-primary" />
                        <span>{classItem.max_capacity} {t('classes.capacity')}</span>
                      </div>
                      {classItem.trainer && (
                        <p className="text-sm">
                          <span className="text-muted-foreground">{t('classes.trainer')}:</span>{' '}
                          <span className="text-primary">{classItem.trainer.name}</span>
                        </p>
                      )}
                      <Button 
                        className="w-full mt-4" 
                        onClick={() => handleBookClass(classItem)}
                      >
                        {t('classes.book')}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {selectedClass && (
        <BookingModal
          isOpen={isBookingModalOpen}
          onClose={() => {
            setIsBookingModalOpen(false);
            setSelectedClass(null);
            setSelectedDate(undefined);
          }}
          classItem={selectedClass}
          userId={user?.id}
          preSelectedDate={selectedDate}
        />
      )}
    </div>
  );
}