import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';

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
}

export const BookingModal = ({ isOpen, onClose, classItem, userId }: BookingModalProps) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [loading, setLoading] = useState(false);

  const handleConfirmBooking = async () => {
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
      // Validate input
      const validatedData = bookingSchema.parse({
        booking_date: selectedDate,
        class_id: classItem.id,
        user_id: userId,
      });

      // Check if booking already exists
      const { data: existingBooking } = await supabase
        .from('bookings')
        .select('id')
        .eq('user_id', userId)
        .eq('class_id', classItem.id)
        .eq('booking_date', selectedDate.toISOString().split('T')[0])
        .eq('status', 'confirmed')
        .maybeSingle();

      if (existingBooking) {
        toast({
          title: 'Already Booked',
          description: 'You already have a booking for this class on this date',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      const { error } = await supabase
        .from('bookings')
        .insert({
          user_id: validatedData.user_id,
          class_id: validatedData.class_id,
          booking_date: validatedData.booking_date.toISOString().split('T')[0],
          status: 'confirmed',
        });

      if (error) throw error;

      toast({ 
        title: t('booking.success'),
        description: 'Your booking has been confirmed successfully',
      });
      onClose();
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
            onSelect={setSelectedDate}
            disabled={(date) => date < new Date()}
            className="rounded-md border border-border"
          />
          <Button 
            onClick={handleConfirmBooking} 
            disabled={!selectedDate || loading}
            className="w-full"
          >
            {loading ? '...' : t('booking.confirm')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};