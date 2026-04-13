import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Calendar, Clock, Mail, Phone, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';

interface ClassDetailsProps {
  classId: string;
  className: string;
  classTime: string;
  classDay: number;
  maxCapacity: number;
}

interface Booking {
  id: string;
  booking_date: string;
  status: string;
  profiles: {
    full_name: string;
    email: string;
    phone: string | null;
  };
}

export const TrainerClassDetails = ({ 
  classId, 
  className,
  classTime,
  classDay,
  maxCapacity 
}: ClassDetailsProps) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const daysOfWeek = ['Κυριακή', 'Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο'];

  useEffect(() => {
    loadClassData();
  }, [classId]);

  const loadClassData = async () => {
    setLoading(true);
    try {
      // Load ALL confirmed bookings for this class (no date filter)
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select('id, booking_date, status, user_id')
        .eq('class_id', classId)
        .eq('status', 'confirmed')
        .order('booking_date', { ascending: true });

      if (bookingsData && bookingsData.length > 0) {
        const userIds = bookingsData.map(b => b.user_id);
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, email, phone')
          .in('id', userIds);

        const bookingsWithProfiles = bookingsData.map(booking => ({
          ...booking,
          profiles: profilesData?.find(p => p.id === booking.user_id) || {
            full_name: 'N/A',
            email: 'N/A',
            phone: null
          }
        }));

        setBookings(bookingsWithProfiles as Booking[]);
      } else {
        setBookings([]);
      }
    } catch (error) {
      console.error('Error loading class data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    setCancellingId(bookingId);
    try {
      const { error: updateError } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId);

      if (updateError) throw updateError;

      await supabase.functions.invoke('notify-booking-status', {
        body: { bookingId, status: 'cancelled' }
      });

      toast({
        title: 'Η κράτηση ακυρώθηκε',
        description: 'Στάλθηκε ειδοποίηση στο μέλος.',
      });

      loadClassData();
    } catch (error: any) {
      console.error('Error cancelling booking:', error);
      toast({
        title: 'Σφάλμα',
        description: 'Δεν ήταν δυνατή η ακύρωση της κράτησης.',
        variant: 'destructive',
      });
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <Card className="bg-gradient-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{className}</CardTitle>
            <CardDescription>
              <div className="flex flex-col gap-1 mt-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span>{daysOfWeek[classDay]}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <span>{classTime}</span>
                </div>
              </div>
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{bookings.length}</div>
            <p className="text-sm text-muted-foreground">Κρατήσεις</p>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <p className="text-center text-muted-foreground py-4">Φόρτωση...</p>
        ) : bookings.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">Δεν υπάρχουν κρατήσεις</p>
        ) : (
          <div className="rounded-md border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Μέλος</TableHead>
                  <TableHead>Ημερομηνία</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Τηλέφωνο</TableHead>
                  <TableHead className="text-right">Ενέργειες</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell className="font-medium">
                      {booking.profiles?.full_name || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {format(new Date(booking.booking_date), 'EEEE, d MMM yyyy', { locale: el })}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <a 
                          href={`mailto:${booking.profiles?.email}`}
                          className="text-primary hover:underline"
                        >
                          {booking.profiles?.email}
                        </a>
                      </div>
                    </TableCell>
                    <TableCell>
                      {booking.profiles?.phone ? (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <a 
                            href={`tel:${booking.profiles.phone}`}
                            className="text-primary hover:underline"
                          >
                            {booking.profiles.phone}
                          </a>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={cancellingId === booking.id}
                        onClick={() => handleCancelBooking(booking.id)}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        {cancellingId === booking.id ? 'Ακύρωση...' : 'Ακύρωση'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
