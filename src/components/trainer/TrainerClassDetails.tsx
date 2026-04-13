import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Calendar, Users, Clock, Mail, Phone, UserCheck, UserX, AlertCircle, XCircle } from 'lucide-react';
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

interface WaitlistEntry {
  id: string;
  booking_date: string;
  position: number;
  notified: boolean;
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
  const [selectedDate, setSelectedDate] = useState<string>(getNextClassDate(classDay));
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const daysOfWeek = ['Κυριακή', 'Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο'];

  // Generate next 8 weeks of class dates
  const availableDates = Array.from({ length: 8 }, (_, i) => {
    const date = new Date();
    const today = date.getDay();
    const daysUntilClass = (classDay - today + 7) % 7 || 7;
    date.setDate(date.getDate() + daysUntilClass + (i * 7));
    return date.toISOString().split('T')[0];
  });

  useEffect(() => {
    loadClassData();
  }, [selectedDate]);

  const loadClassData = async () => {
    setLoading(true);
    try {
      // Load bookings with user profiles
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select('id, booking_date, status, user_id')
        .eq('class_id', classId)
        .eq('booking_date', selectedDate)
        .order('created_at');

      if (bookingsData) {
        // Fetch profiles separately
        const userIds = bookingsData.map(b => b.user_id);
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, email, phone')
          .in('id', userIds);

        // Merge bookings with profiles
        const bookingsWithProfiles = bookingsData.map(booking => ({
          ...booking,
          profiles: profilesData?.find(p => p.id === booking.user_id) || {
            full_name: 'N/A',
            email: 'N/A',
            phone: null
          }
        }));

        setBookings(bookingsWithProfiles as Booking[]);
      }

      // Load waitlist with user profiles
      const { data: waitlistData } = await supabase
        .from('waitlist')
        .select('id, booking_date, position, notified, user_id')
        .eq('class_id', classId)
        .eq('booking_date', selectedDate)
        .order('position');

      if (waitlistData) {
        // Fetch profiles separately
        const userIds = waitlistData.map(w => w.user_id);
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, email, phone')
          .in('id', userIds);

        // Merge waitlist with profiles
        const waitlistWithProfiles = waitlistData.map(entry => ({
          ...entry,
          profiles: profilesData?.find(p => p.id === entry.user_id) || {
            full_name: 'N/A',
            email: 'N/A',
            phone: null
          }
        }));

        setWaitlist(waitlistWithProfiles as WaitlistEntry[]);
      }
    } catch (error) {
      console.error('Error loading class data:', error);
    } finally {
      setLoading(false);
    }
  };

  function getNextClassDate(dayOfWeek: number): string {
    const date = new Date();
    const today = date.getDay();
    const daysUntilClass = (dayOfWeek - today + 7) % 7 || 7;
    date.setDate(date.getDate() + daysUntilClass);
    return date.toISOString().split('T')[0];
  }

  const confirmedBookings = bookings.filter(b => b.status === 'confirmed');
  const cancelledBookings = bookings.filter(b => b.status === 'cancelled');
  const availableSpots = maxCapacity - confirmedBookings.length;

  const handleCancelBooking = async (bookingId: string) => {
    setCancellingId(bookingId);
    try {
      // Update booking status to cancelled
      const { error: updateError } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId);

      if (updateError) throw updateError;

      // Send cancellation email
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
            <div className="text-2xl font-bold">{confirmedBookings.length}/{maxCapacity}</div>
            <p className="text-sm text-muted-foreground">Κρατήσεις</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Date Selector */}
        <div>
          <label className="text-sm font-medium mb-2 block">Επιλογή Ημερομηνίας</label>
          <select 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full p-2 border border-border rounded-md bg-background"
          >
            {availableDates.map(date => (
              <option key={date} value={date}>
                {format(new Date(date), 'EEEE, d MMMM yyyy', { locale: el })}
              </option>
            ))}
          </select>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-muted/20">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{confirmedBookings.length}</p>
                  <p className="text-xs text-muted-foreground">Επιβεβαιωμένες</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-muted/20">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{availableSpots}</p>
                  <p className="text-xs text-muted-foreground">Διαθέσιμες</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-muted/20">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-500" />
                <div>
                  <p className="text-2xl font-bold">{waitlist.length}</p>
                  <p className="text-xs text-muted-foreground">Λίστα Αναμονής</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for Bookings and Waitlist */}
        <Tabs defaultValue="bookings">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="bookings">
              Κρατήσεις ({confirmedBookings.length})
            </TabsTrigger>
            <TabsTrigger value="waitlist">
              Λίστα Αναμονής ({waitlist.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="bookings" className="space-y-4">
            {loading ? (
              <p className="text-center text-muted-foreground py-4">Φόρτωση...</p>
            ) : confirmedBookings.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">Δεν υπάρχουν κρατήσεις</p>
            ) : (
              <div className="rounded-md border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Μέλος</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Τηλέφωνο</TableHead>
                      <TableHead>Κατάσταση</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {confirmedBookings.map((booking) => (
                      <TableRow key={booking.id}>
                        <TableCell className="font-medium">
                          {booking.profiles?.full_name || 'N/A'}
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
                        <TableCell>
                          <Badge variant="outline" className="bg-green-500/20 text-green-600 border-green-500">
                            {booking.status === 'confirmed' ? 'Επιβεβαιωμένη' : booking.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="waitlist" className="space-y-4">
            {loading ? (
              <p className="text-center text-muted-foreground py-4">Φόρτωση...</p>
            ) : waitlist.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">Δεν υπάρχουν εγγραφές στη λίστα αναμονής</p>
            ) : (
              <div className="rounded-md border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Θέση</TableHead>
                      <TableHead>Μέλος</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Κατάσταση</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {waitlist.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>
                          <Badge variant="outline" className="bg-amber-500/20 text-amber-600 border-amber-500">
                            #{entry.position}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {entry.profiles?.full_name || 'N/A'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <a 
                              href={`mailto:${entry.profiles?.email}`}
                              className="text-primary hover:underline"
                            >
                              {entry.profiles.email}
                            </a>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={
                            entry.notified 
                              ? "bg-blue-500/20 text-blue-600 border-blue-500"
                              : "bg-muted/20 text-muted-foreground border-muted"
                          }>
                            {entry.notified ? 'Ειδοποιήθηκε' : 'Αναμονή'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};