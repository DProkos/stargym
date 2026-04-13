import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Navigation } from '@/components/Navigation';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Clock, CalendarDays, List } from 'lucide-react';
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

export default function MyBookings() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return;
      }
      setUser(session.user);

      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .eq('role', 'admin')
        .single();
      setIsAdmin(!!data);

      loadBookings(session.user.id);
    };

    checkUser();
  }, [navigate]);

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

  const canCancelBooking = (booking: Booking): boolean => {
    const bookingDate = new Date(booking.booking_date);
    const [hours, minutes] = booking.class.time.split(':').map(Number);
    bookingDate.setHours(hours, minutes, 0, 0);
    
    const now = new Date();
    const hoursUntilClass = (bookingDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    return hoursUntilClass >= 24;
  };

  const getTimeUntilClass = (booking: Booking): string => {
    const bookingDate = new Date(booking.booking_date);
    const [hours, minutes] = booking.class.time.split(':').map(Number);
    bookingDate.setHours(hours, minutes, 0, 0);
    
    const now = new Date();
    const hoursUntilClass = Math.floor((bookingDate.getTime() - now.getTime()) / (1000 * 60 * 60));
    
    if (hoursUntilClass < 24) {
      return `${hoursUntilClass} ώρες`;
    }
    return '';
  };

  const handleCancelBooking = async (bookingId: string) => {
    const booking = bookings.find(b => b.id === bookingId);
    if (booking && !canCancelBooking(booking)) {
      toast({ 
        title: 'Δεν είναι δυνατή η ακύρωση', 
        description: 'Η ακύρωση επιτρέπεται μόνο έως 24 ώρες πριν το μάθημα', 
        variant: 'destructive' 
      });
      return;
    }

    // Get booking details before canceling
    const { data: bookingData } = await supabase
      .from('bookings')
      .select('class_id, booking_date')
      .eq('id', bookingId)
      .single();

    const { error } = await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', bookingId);

    if (error) {
      toast({ title: 'Σφάλμα', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Η κράτηση ακυρώθηκε επιτυχώς' });
      if (user) loadBookings(user.id);

      // Notify waitlist if booking was cancelled and had booking details
      if (bookingData) {
        try {
          await supabase.functions.invoke('notify-waitlist', {
            body: {
              class_id: bookingData.class_id,
              booking_date: bookingData.booking_date,
            }
          });
        } catch (error) {
          console.error('Failed to notify waitlist:', error);
        }
      }
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
    <div className="min-h-screen bg-background">
      <Navigation user={user} isAdmin={isAdmin} />
      
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {language === 'el' ? 'Μαθήματα' : 'Browse Classes'}
            </h1>
          </div>

          <div className="space-y-4">
            {bookings.length === 0 ? (
              <Card className="bg-gradient-card border-border">
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">
                    {language === 'el' ? 'Δεν υπάρχουν κρατήσεις' : 'No bookings yet'}
                  </p>
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
                      <div className="flex flex-col gap-2">
                        {!canCancelBooking(booking) && (
                          <p className="text-sm text-muted-foreground">
                            ⚠️ {language === 'el' ? 'Η ακύρωση δεν είναι δυνατή (λιγότερο από 24 ώρες πριν το μάθημα)' : 'Cancellation not possible (less than 24 hours before class)'}
                          </p>
                        )}
                        <Button 
                          variant="destructive" 
                          onClick={() => handleCancelBooking(booking.id)}
                          disabled={!canCancelBooking(booking)}
                        >
                          {t('booking.cancel')}
                        </Button>
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}