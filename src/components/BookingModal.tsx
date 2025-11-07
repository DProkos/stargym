import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Users, CheckCircle, XCircle, Repeat } from 'lucide-react';
import { z } from 'zod';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useConfetti } from '@/hooks/useConfetti';

const bookingSchema = z.object({
  booking_date: z.date({ required_error: 'Please select a date' }),
  class_id: z.string().uuid(),
  user_id: z.string().uuid(),
});

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  classItem: any;
  userId: string;
  preSelectedDate?: Date;
}

export const BookingModal = ({ isOpen, onClose, classItem, userId, preSelectedDate }: BookingModalProps) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { fireConfetti } = useConfetti();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(preSelectedDate || new Date());
  const [loading, setLoading] = useState(false);
  const [availability, setAvailability] = useState<{
    booked: number;
    available: number;
    isFull: boolean;
  } | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [isInWaitlist, setIsInWaitlist] = useState(false);
  const [waitlistPosition, setWaitlistPosition] = useState<number | null>(null);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringWeeks, setRecurringWeeks] = useState<string>('4');

  useEffect(() => {
    if (preSelectedDate) {
      setSelectedDate(preSelectedDate);
    }
  }, [preSelectedDate]);

  useEffect(() => {
    if (isOpen && selectedDate) {
      checkAvailability(selectedDate);
      checkWaitlistStatus(selectedDate);
    }
  }, [isOpen, selectedDate]);

  const checkWaitlistStatus = async (date: Date) => {
    if (!date || !classItem?.id || !userId) return;
    
    try {
      const dateString = date.toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('waitlist')
        .select('position')
        .eq('user_id', userId)
        .eq('class_id', classItem.id)
        .eq('booking_date', dateString)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setIsInWaitlist(true);
        setWaitlistPosition(data.position);
      } else {
        setIsInWaitlist(false);
        setWaitlistPosition(null);
      }
    } catch (error) {
      console.error('Failed to check waitlist status:', error);
    }
  };

  const checkAvailability = async (date: Date) => {
    if (!date || !classItem?.id) return;
    
    setCheckingAvailability(true);
    try {
      const dateString = date.toISOString().split('T')[0];
      
      // Count existing bookings for this class on this date
      const { data, error, count } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: false })
        .eq('class_id', classItem.id)
        .eq('booking_date', dateString)
        .eq('status', 'confirmed');

      if (error) throw error;

      const bookedCount = count || 0;
      const maxCapacity = classItem.max_capacity || 20;
      const availableCount = maxCapacity - bookedCount;

      setAvailability({
        booked: bookedCount,
        available: availableCount,
        isFull: bookedCount >= maxCapacity,
      });
    } catch (error) {
      console.error('Failed to check availability:', error);
    } finally {
      setCheckingAvailability(false);
    }
  };

  const handleDateSelect = async (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      await checkAvailability(date);
      await checkWaitlistStatus(date);
    } else {
      setAvailability(null);
      setIsInWaitlist(false);
      setWaitlistPosition(null);
    }
  };

  const handleJoinWaitlist = async () => {
    if (!selectedDate) {
      toast({
        title: 'Validation Error',
        description: 'Please select a date',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('waitlist')
        .insert({
          user_id: userId,
          class_id: classItem.id,
          booking_date: selectedDate.toISOString().split('T')[0],
          position: 0, // Will be set by trigger
        });

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          toast({
            title: 'Already in Waitlist',
            description: 'You are already on the waitlist for this class',
            variant: 'destructive',
          });
        } else {
          throw error;
        }
      } else {
        toast({ 
          title: 'Joined Waitlist',
          description: 'You have been added to the waitlist. We will notify you via email when a spot opens.',
        });
        await checkWaitlistStatus(selectedDate);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to join waitlist',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveWaitlist = async () => {
    if (!selectedDate) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('waitlist')
        .delete()
        .eq('user_id', userId)
        .eq('class_id', classItem.id)
        .eq('booking_date', selectedDate.toISOString().split('T')[0]);

      if (error) throw error;

      toast({ 
        title: 'Left Waitlist',
        description: 'You have been removed from the waitlist',
      });
      setIsInWaitlist(false);
      setWaitlistPosition(null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to leave waitlist',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmBooking = async () => {
    if (!selectedDate) {
      toast({
        title: 'Validation Error',
        description: 'Please select a date',
        variant: 'destructive',
      });
      return;
    }

    if (availability?.isFull) {
      toast({
        title: 'Class Full',
        description: 'This class is fully booked for the selected date',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const bookingsToCreate = [];
      const weeks = isRecurring ? parseInt(recurringWeeks) : 1;
      
      // Generate booking dates
      for (let i = 0; i < weeks; i++) {
        const bookingDate = new Date(selectedDate);
        bookingDate.setDate(bookingDate.getDate() + (i * 7));
        
        bookingsToCreate.push({
          user_id: userId,
          class_id: classItem.id,
          booking_date: bookingDate.toISOString().split('T')[0],
          status: 'confirmed',
        });
      }

      // Check for existing bookings
      const bookingDates = bookingsToCreate.map(b => b.booking_date);
      const { data: existingBookings } = await supabase
        .from('bookings')
        .select('booking_date')
        .eq('user_id', userId)
        .eq('class_id', classItem.id)
        .in('booking_date', bookingDates)
        .eq('status', 'confirmed');

      if (existingBookings && existingBookings.length > 0) {
        const existingDates = existingBookings.map(b => 
          new Date(b.booking_date).toLocaleDateString('el-GR')
        ).join(', ');
        
        toast({
          title: 'Already Booked',
          description: `Έχετε ήδη κρατήσεις για τις ημερομηνίες: ${existingDates}`,
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      // Check availability for all dates
      const availabilityChecks = await Promise.all(
        bookingsToCreate.map(async (booking) => {
          const { count } = await supabase
            .from('bookings')
            .select('*', { count: 'exact', head: true })
            .eq('class_id', classItem.id)
            .eq('booking_date', booking.booking_date)
            .eq('status', 'confirmed');
          
          return {
            date: booking.booking_date,
            available: classItem.max_capacity - (count || 0),
            isFull: (count || 0) >= classItem.max_capacity,
          };
        })
      );

      const fullDates = availabilityChecks.filter(check => check.isFull);
      
      if (fullDates.length > 0) {
        const fullDatesList = fullDates.map(d => 
          new Date(d.date).toLocaleDateString('el-GR')
        ).join(', ');
        
        toast({
          title: 'Class Full',
          description: `Οι ακόλουθες ημερομηνίες είναι πλήρεις: ${fullDatesList}`,
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      // Create all bookings
      const { error } = await supabase
        .from('bookings')
        .insert(bookingsToCreate);

      if (error) throw error;

      const successMessage = isRecurring 
        ? `Επιτυχής κράτηση για ${weeks} εβδομάδες!`
        : 'Your booking has been confirmed successfully';

      // Fire confetti celebration
      fireConfetti();

      toast({ 
        title: t('booking.success'),
        description: successMessage,
      });
      
      // Close modal after a short delay to show confetti
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: 'Validation Error',
          description: error.errors[0].message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: error.message || 'Failed to create booking',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-card border-border">
        <DialogHeader>
          <DialogTitle>{classItem.name}</DialogTitle>
          <DialogDescription>{t('booking.selectDate')}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-4">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            disabled={(date) => date < new Date()}
            className="rounded-md border border-border pointer-events-auto"
          />
          
          {/* Availability Information */}
          {checkingAvailability && (
            <Alert className="w-full">
              <AlertDescription className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                Checking availability...
              </AlertDescription>
            </Alert>
          )}

          {!checkingAvailability && availability && selectedDate && (
            <Alert className={availability.isFull ? "border-destructive" : "border-green-500"}>
              <AlertDescription className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className={`h-5 w-5 ${availability.isFull ? 'text-destructive' : 'text-green-500'}`} />
                  <div>
                    <p className="font-semibold">
                      {availability.isFull ? (
                        <span className="text-destructive flex items-center gap-1">
                          <XCircle className="h-4 w-4" />
                          Πλήρης - Δεν υπάρχουν διαθέσιμες θέσεις
                        </span>
                      ) : (
                        <span className="text-green-500 flex items-center gap-1">
                          <CheckCircle className="h-4 w-4" />
                          {availability.available} {availability.available === 1 ? 'θέση διαθέσιμη' : 'θέσεις διαθέσιμες'}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {availability.booked}/{classItem.max_capacity} κρατήσεις
                    </p>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {isInWaitlist && waitlistPosition && (
            <Alert className="border-amber-500">
              <AlertDescription className="text-amber-600">
                Είστε στη λίστα αναμονής - Θέση #{waitlistPosition}
              </AlertDescription>
            </Alert>
          )}

          {/* Recurring Booking Options */}
          {!availability?.isFull && !isInWaitlist && selectedDate && (
            <div className="space-y-4 p-4 border border-border rounded-lg bg-muted/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Repeat className="h-4 w-4 text-primary" />
                  <Label htmlFor="recurring-mode" className="font-semibold">
                    Επαναλαμβανόμενη Κράτηση
                  </Label>
                </div>
                <Switch
                  id="recurring-mode"
                  checked={isRecurring}
                  onCheckedChange={setIsRecurring}
                />
              </div>
              
              {isRecurring && (
                <div className="space-y-2">
                  <Label htmlFor="recurring-weeks">
                    Αριθμός Εβδομάδων
                  </Label>
                  <Select value={recurringWeeks} onValueChange={setRecurringWeeks}>
                    <SelectTrigger id="recurring-weeks">
                      <SelectValue placeholder="Επιλέξτε εβδομάδες" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">2 Εβδομάδες</SelectItem>
                      <SelectItem value="3">3 Εβδομάδες</SelectItem>
                      <SelectItem value="4">4 Εβδομάδες</SelectItem>
                      <SelectItem value="6">6 Εβδομάδες</SelectItem>
                      <SelectItem value="8">8 Εβδομάδες</SelectItem>
                      <SelectItem value="12">12 Εβδομάδες</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Θα κλείσετε την τάξη κάθε {new Date(selectedDate).toLocaleDateString('el-GR', { weekday: 'long' })} για {recurringWeeks} εβδομάδες
                  </p>
                </div>
              )}
            </div>
          )}

          {availability?.isFull && !isInWaitlist ? (
            <Button 
              onClick={handleJoinWaitlist} 
              disabled={!selectedDate || loading}
              variant="outline"
              className="w-full"
            >
              {loading ? '...' : 'Εγγραφή σε Λίστα Αναμονής'}
            </Button>
          ) : isInWaitlist ? (
            <Button 
              onClick={handleLeaveWaitlist} 
              disabled={loading}
              variant="destructive"
              className="w-full"
            >
              {loading ? '...' : 'Αποχώρηση από Λίστα Αναμονής'}
            </Button>
          ) : (
            <Button 
              onClick={handleConfirmBooking} 
              disabled={!selectedDate || loading || availability?.isFull || checkingAvailability}
              className="w-full"
            >
              {loading ? '...' : isRecurring ? `Κλείσε ${recurringWeeks} Εβδομάδες` : t('booking.confirm')}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};