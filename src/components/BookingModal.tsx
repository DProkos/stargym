import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';

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
    if (!selectedDate) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('bookings')
        .insert({
          user_id: userId,
          class_id: classItem.id,
          booking_date: selectedDate.toISOString().split('T')[0],
          status: 'confirmed',
        });

      if (error) throw error;

      toast({ title: t('booking.success') });
      onClose();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
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