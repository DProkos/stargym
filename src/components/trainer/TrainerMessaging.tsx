import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Mail, Send } from 'lucide-react';

interface ClassOption {
  id: string;
  name: string;
  day_of_week: number;
  time: string;
}

interface TrainerMessagingProps {
  trainerId: string;
  classes: ClassOption[];
}

export const TrainerMessaging = ({ trainerId, classes }: TrainerMessagingProps) => {
  const { toast } = useToast();
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [memberEmails, setMemberEmails] = useState<string[]>([]);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [memberCount, setMemberCount] = useState(0);

  const daysOfWeek = ['Κυριακή', 'Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο'];

  useEffect(() => {
    if (selectedClassId) {
      loadClassMembers();
    } else {
      setMemberEmails([]);
      setMemberCount(0);
    }
  }, [selectedClassId]);

  const loadClassMembers = async () => {
    try {
      // Get all confirmed bookings for this class (unique users)
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select('user_id')
        .eq('class_id', selectedClassId)
        .eq('status', 'confirmed');

      if (bookingsData && bookingsData.length > 0) {
        // Get unique user IDs
        const uniqueUserIds = [...new Set(bookingsData.map(b => b.user_id))];
        
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('email')
          .in('id', uniqueUserIds);

        const emails = profilesData?.map(p => p.email).filter(Boolean) || [];
        setMemberEmails(emails);
        setMemberCount(emails.length);
      } else {
        setMemberEmails([]);
        setMemberCount(0);
      }
    } catch (error) {
      console.error('Error loading members:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!subject.trim() || !message.trim()) {
      toast({
        title: 'Σφάλμα',
        description: 'Συμπληρώστε θέμα και μήνυμα',
        variant: 'destructive',
      });
      return;
    }

    if (memberEmails.length === 0) {
      toast({
        title: 'Δεν υπάρχουν παραλήπτες',
        description: 'Δεν βρέθηκαν μέλη με κρατήσεις σε αυτή την τάξη',
        variant: 'destructive',
      });
      return;
    }

    setSending(true);
    try {
      const selectedClass = classes.find(c => c.id === selectedClassId);
      let successCount = 0;
      let failCount = 0;

      for (const email of memberEmails) {
        try {
          const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Μήνυμα από τον Trainer</h2>
              <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0;"><strong>Τάξη:</strong> ${selectedClass?.name}</p>
              </div>
              <div style="margin: 20px 0;">
                ${message.split('\n').map(line => `<p style="margin: 10px 0;">${line}</p>`).join('')}
              </div>
              <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;" />
              <p style="color: #666; font-size: 12px;">
                Αυτό το μήνυμα στάλθηκε από τον trainer της τάξης σας.
              </p>
            </div>
          `;

          const { error } = await supabase.functions.invoke('send-email', {
            body: { to: email, subject, html: emailHtml, text: message }
          });

          if (error) { failCount++; } else { successCount++; }
        } catch {
          failCount++;
        }
      }

      if (successCount > 0) {
        toast({
          title: 'Επιτυχής αποστολή',
          description: `Στάλθηκαν ${successCount} email${failCount > 0 ? ` (${failCount} απέτυχαν)` : ''}`,
        });
        setSubject('');
        setMessage('');
      }

      if (failCount === memberEmails.length) {
        toast({
          title: 'Αποτυχία αποστολής',
          description: 'Δεν στάλθηκε κανένα email. Ελέγξτε τις ρυθμίσεις SMTP.',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Error sending messages:', error);
      toast({
        title: 'Σφάλμα',
        description: error.message || 'Αποτυχία αποστολής',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="bg-gradient-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" />
          Αποστολή Μηνύματος σε Μέλη
        </CardTitle>
        <CardDescription>
          Επιλέξτε τάξη και γράψτε το μήνυμά σας
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Class Selection */}
        <div className="space-y-2">
          <Label>Τάξη</Label>
          <Select value={selectedClassId} onValueChange={setSelectedClassId}>
            <SelectTrigger>
              <SelectValue placeholder="Επιλέξτε τάξη" />
            </SelectTrigger>
            <SelectContent>
              {classes.map((cls) => (
                <SelectItem key={cls.id} value={cls.id}>
                  {cls.name} - {daysOfWeek[cls.day_of_week]} {cls.time}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedClassId && (
            <p className="text-sm text-muted-foreground">
              {memberCount > 0 ? `${memberCount} μέλη θα λάβουν το μήνυμα` : 'Δεν βρέθηκαν μέλη με κρατήσεις'}
            </p>
          )}
        </div>

        {/* Subject */}
        <div className="space-y-2">
          <Label>Θέμα</Label>
          <Input
            placeholder="π.χ. Ενημέρωση για την τάξη"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>

        {/* Message */}
        <div className="space-y-2">
          <Label>Μήνυμα</Label>
          <Textarea
            placeholder="Γράψτε το μήνυμά σας εδώ..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={6}
            className="resize-none"
          />
        </div>

        {/* Send Button */}
        <Button
          onClick={handleSendMessage}
          disabled={sending || memberEmails.length === 0 || !subject.trim() || !message.trim()}
          className="w-full flex items-center gap-2"
          size="lg"
        >
          <Send className="h-4 w-4" />
          {sending ? 'Αποστολή...' : 'Αποστολή'}
        </Button>
      </CardContent>
    </Card>
  );
};
