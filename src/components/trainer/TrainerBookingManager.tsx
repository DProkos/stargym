import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Check, X, Calendar, Clock, User, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';

interface Booking {
  id: string;
  booking_date: string;
  status: string;
  created_at: string;
  trainer_notes: string | null;
  user_id: string;
  class: {
    id: string;
    name: string;
    time: string;
    specific_date: string | null;
  };
  profile: {
    full_name: string | null;
    email: string;
    phone: string | null;
  };
}

interface TrainerBookingManagerProps {
  trainerId: string;
}

export function TrainerBookingManager({ trainerId }: TrainerBookingManagerProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const { toast } = useToast();

  useEffect(() => {
    loadBookings();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel('trainer-bookings')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
        },
        () => {
          loadBookings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [trainerId]);

  const loadBookings = async () => {
    try {
      // Get all classes for this trainer
      const { data: classes, error: classError } = await supabase
        .from('classes')
        .select('id')
        .eq('trainer_id', trainerId);

      if (classError) throw classError;

      if (!classes || classes.length === 0) {
        setBookings([]);
        setLoading(false);
        return;
      }

      const classIds = classes.map(c => c.id);

      // Get all bookings for these classes
      const { data: bookingsData, error } = await supabase
        .from('bookings')
        .select(`
          *,
          class:classes(id, name, time, specific_date)
        `)
        .in('class_id', classIds)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!bookingsData) {
        setBookings([]);
        setLoading(false);
        return;
      }

      // Fetch profiles separately
      const userIds = [...new Set(bookingsData.map(b => b.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone')
        .in('id', userIds);

      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);

      const enrichedBookings = bookingsData.map(booking => ({
        ...booking,
        profile: profilesMap.get(booking.user_id) || { full_name: null, email: 'Άγνωστος', phone: null }
      }));

      setBookings(enrichedBookings as Booking[]);
    } catch (error: any) {
      toast({
        title: 'Σφάλμα φόρτωσης κρατήσεων',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const sendNotification = async (bookingId: string, status: 'confirmed' | 'rejected', trainerNotes?: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase.functions.invoke('notify-booking-status', {
        body: { bookingId, status, trainerNotes }
      });

      if (error) {
        console.error('Failed to send notification:', error);
      }
    } catch (err) {
      console.error('Notification error:', err);
    }
  };

  const handleApprove = async (bookingId: string) => {
    setProcessingId(bookingId);
    try {
      const trainerNotes = notes[bookingId] || null;
      
      const { error } = await supabase
        .from('bookings')
        .update({ 
          status: 'confirmed',
          trainer_notes: trainerNotes
        })
        .eq('id', bookingId);

      if (error) throw error;

      // Send email notification
      await sendNotification(bookingId, 'confirmed', trainerNotes || undefined);

      toast({
        title: 'Κράτηση επιβεβαιώθηκε',
        description: 'Ο πελάτης ειδοποιήθηκε με email',
      });

      loadBookings();
    } catch (error: any) {
      toast({
        title: 'Σφάλμα',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (bookingId: string) => {
    setProcessingId(bookingId);
    try {
      const trainerNotes = notes[bookingId] || null;
      
      const { error } = await supabase
        .from('bookings')
        .update({ 
          status: 'rejected',
          trainer_notes: trainerNotes
        })
        .eq('id', bookingId);

      if (error) throw error;

      // Send email notification
      await sendNotification(bookingId, 'rejected', trainerNotes || undefined);

      toast({
        title: 'Κράτηση απορρίφθηκε',
        description: 'Ο πελάτης ειδοποιήθηκε με email',
      });

      loadBookings();
    } catch (error: any) {
      toast({
        title: 'Σφάλμα',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleCancel = async (bookingId: string) => {
    setProcessingId(bookingId);
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId);

      if (error) throw error;

      toast({
        title: 'Κράτηση ακυρώθηκε',
        description: 'Η κράτηση ακυρώθηκε επιτυχώς',
      });

      loadBookings();
    } catch (error: any) {
      toast({
        title: 'Σφάλμα',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };


    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500">Αναμονή</Badge>;
      case 'confirmed':
        return <Badge className="bg-green-500/20 text-green-600 border-green-500">Επιβεβαιωμένη</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/20 text-red-600 border-red-500">Απορρίφθηκε</Badge>;
      case 'cancelled':
        return <Badge className="bg-gray-500/20 text-gray-600 border-gray-500">Ακυρώθηκε</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const pendingBookings = bookings.filter(b => b.status === 'pending');
  const otherBookings = bookings.filter(b => b.status !== 'pending');

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending Bookings */}
      <div>
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          Αιτήματα Κρατήσεων
          {pendingBookings.length > 0 && (
            <Badge variant="destructive">{pendingBookings.length}</Badge>
          )}
        </h3>

        {pendingBookings.length === 0 ? (
          <Card className="bg-gradient-card border-border">
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">Δεν υπάρχουν εκκρεμή αιτήματα</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {pendingBookings.map((booking) => (
              <Card key={booking.id} className="bg-gradient-card border-border border-l-4 border-l-yellow-500">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{booking.class.name}</CardTitle>
                      <CardDescription className="flex flex-col gap-1 mt-1">
                        <span className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          {booking.profile?.full_name || booking.profile?.email || 'Άγνωστος'}
                        </span>
                        <span className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(booking.booking_date), 'EEEE, d MMMM yyyy', { locale: el })}
                        </span>
                        <span className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          {booking.class.time}
                        </span>
                      </CardDescription>
                    </div>
                    {getStatusBadge(booking.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground flex items-center gap-1">
                      <MessageSquare className="h-4 w-4" />
                      Σημείωση (προαιρετικά)
                    </label>
                    <Textarea
                      placeholder="Προσθέστε σημείωση για τον πελάτη..."
                      value={notes[booking.id] || ''}
                      onChange={(e) => setNotes({ ...notes, [booking.id]: e.target.value })}
                      rows={2}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleApprove(booking.id)}
                      disabled={processingId === booking.id}
                      className="flex-1"
                    >
                      {processingId === booking.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Αποδοχή
                        </>
                      )}
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleReject(booking.id)}
                      disabled={processingId === booking.id}
                      className="flex-1"
                    >
                      {processingId === booking.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <X className="h-4 w-4 mr-2" />
                          Απόρριψη
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* All Bookings History */}
      <div>
        <h3 className="text-xl font-bold mb-4">Ιστορικό Κρατήσεων</h3>
        
        {otherBookings.length === 0 ? (
          <Card className="bg-gradient-card border-border">
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">Δεν υπάρχουν κρατήσεις</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {otherBookings.map((booking) => (
              <Card key={booking.id} className="bg-gradient-card border-border">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="font-medium">{booking.class.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {booking.profile?.full_name || booking.profile?.email} • {' '}
                        {format(new Date(booking.booking_date), 'd/M/yyyy')} • {booking.class.time}
                      </p>
                      {booking.trainer_notes && (
                        <p className="text-sm text-muted-foreground italic">
                          Σημείωση: {booking.trainer_notes}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(booking.status)}
                      {booking.status === 'confirmed' && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleCancel(booking.id)}
                          disabled={processingId === booking.id}
                        >
                          {processingId === booking.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <X className="h-4 w-4 mr-1" />
                              Ακύρωση
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
