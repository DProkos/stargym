import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Clock, List, CalendarDays } from 'lucide-react';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebarCustomer } from "@/components/app-sidebar-customer";
import BookingCalendar from '@/components/BookingCalendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Booking {
  id: string;
  booking_date: string;
  status: string;
  class: {
    name: string;
    time: string;
    duration_minutes: number;
  };
}

export default function CustomerPortal() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  useEffect(() => {
    const loadData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
        loadBookings(session.user.id);
      }
    };

    loadData();
  }, []);

  const loadBookings = async (userId: string) => {
    const { data } = await supabase
      .from('bookings')
      .select(`
        *,
        class:classes(name, time, duration_minutes)
      `)
      .eq('user_id', userId)
      .order('booking_date', { ascending: true });

    if (data) {
      setBookings(data);
    }
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

  const calendarEvents = bookings.map(booking => {
    const bookingDate = new Date(booking.booking_date);
    const [hours, minutes] = booking.class.time.split(':').map(Number);
    const startTime = new Date(bookingDate);
    startTime.setHours(hours, minutes, 0);
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + booking.class.duration_minutes);

    return {
      id: booking.id,
      title: booking.class.name,
      start: startTime,
      end: endTime,
      resource: booking,
      status: booking.status,
    };
  });

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

              <Tabs defaultValue="calendar" className="space-y-4">
                <TabsList className="grid w-full max-w-md grid-cols-2">
                  <TabsTrigger value="calendar" className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    Calendar View
                  </TabsTrigger>
                  <TabsTrigger value="list" className="flex items-center gap-2">
                    <List className="h-4 w-4" />
                    List View
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="calendar" className="space-y-4">
                  <BookingCalendar 
                    events={calendarEvents}
                    onSelectEvent={(event) => setSelectedBooking(event.resource)}
                  />
                  
                  {selectedBooking && (
                    <Card className="bg-gradient-card border-border">
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span>{selectedBooking.class.name}</span>
                          <span className={`text-sm px-3 py-1 rounded-full ${
                            selectedBooking.status === 'confirmed' 
                              ? 'bg-primary/20 text-primary' 
                              : 'bg-destructive/20 text-destructive'
                          }`}>
                            {selectedBooking.status}
                          </span>
                        </CardTitle>
                        <CardDescription>
                          <div className="flex flex-col gap-2 mt-2">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-primary" />
                              <span>{new Date(selectedBooking.booking_date).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-primary" />
                              <span>{selectedBooking.class.time} ({selectedBooking.class.duration_minutes} min)</span>
                            </div>
                          </div>
                        </CardDescription>
                      </CardHeader>
                      {selectedBooking.status === 'confirmed' && (
                        <CardContent>
                          <div className="flex gap-2">
                            <Button 
                              variant="destructive" 
                              onClick={() => handleCancelBooking(selectedBooking.id)}
                            >
                              {t('booking.cancel')}
                            </Button>
                            <Button 
                              variant="outline" 
                              onClick={() => setSelectedBooking(null)}
                            >
                              Close
                            </Button>
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="list" className="space-y-4">
                {bookings.length === 0 ? (
                  <Card className="bg-gradient-card border-border">
                    <CardContent className="pt-6">
                      <p className="text-center text-muted-foreground">No bookings yet</p>
                    </CardContent>
                  </Card>
                ) : (
                  bookings.map((booking) => (
                    <Card key={booking.id} className="bg-gradient-card border-border">
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span>{booking.class.name}</span>
                          <span className={`text-sm px-3 py-1 rounded-full ${
                            booking.status === 'confirmed' 
                              ? 'bg-primary/20 text-primary' 
                              : 'bg-destructive/20 text-destructive'
                          }`}>
                            {booking.status}
                          </span>
                        </CardTitle>
                        <CardDescription>
                          <div className="flex flex-col gap-2 mt-2">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-primary" />
                              <span>{new Date(booking.booking_date).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-primary" />
                              <span>{booking.class.time} ({booking.class.duration_minutes} min)</span>
                            </div>
                          </div>
                        </CardDescription>
                      </CardHeader>
                      {booking.status === 'confirmed' && (
                        <CardContent>
                          <Button 
                            variant="destructive" 
                            onClick={() => handleCancelBooking(booking.id)}
                          >
                            {t('booking.cancel')}
                          </Button>
                        </CardContent>
                      )}
                    </Card>
                  ))
                )}
                </TabsContent>
              </Tabs>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
