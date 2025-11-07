import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Clock } from 'lucide-react';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebarCustomer } from "@/components/app-sidebar-customer";

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
      if (user) loadBookings(user.id);
    }
  };

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
            <div className="max-w-4xl mx-auto">
              <Card className="bg-gradient-card border-border mb-6">
                <CardHeader>
                  <CardTitle>Welcome, {user?.user_metadata?.full_name || user?.email}</CardTitle>
                  <CardDescription>Manage your bookings and profile</CardDescription>
                </CardHeader>
              </Card>

              <div className="space-y-4">
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
              </div>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
