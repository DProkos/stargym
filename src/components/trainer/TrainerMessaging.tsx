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
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Mail, Users, Send, Calendar, Check } from 'lucide-react';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';

interface ClassOption {
  id: string;
  name: string;
  day_of_week: number;
  time: string;
}

interface ClassMember {
  user_id: string;
  booking_date: string;
  profiles: {
    full_name: string;
    email: string;
  };
}

interface TrainerMessagingProps {
  trainerId: string;
  classes: ClassOption[];
}

export const TrainerMessaging = ({ trainerId, classes }: TrainerMessagingProps) => {
  const { toast } = useToast();
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [members, setMembers] = useState<ClassMember[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const daysOfWeek = ['Κυριακή', 'Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο'];

  useEffect(() => {
    if (selectedClassId) {
      const selectedClass = classes.find(c => c.id === selectedClassId);
      if (selectedClass) {
        generateClassDates(selectedClass.day_of_week);
      }
    }
  }, [selectedClassId]);

  useEffect(() => {
    if (selectedClassId && selectedDate) {
      loadClassMembers();
    }
  }, [selectedClassId, selectedDate]);

  const generateClassDates = (dayOfWeek: number) => {
    const dates: string[] = [];
    const today = new Date();
    
    // Generate next 8 weeks of class dates
    for (let i = 0; i < 8; i++) {
      const date = new Date(today);
      const daysUntilClass = (dayOfWeek - date.getDay() + 7) % 7 || 7;
      date.setDate(date.getDate() + daysUntilClass + (i * 7));
      dates.push(date.toISOString().split('T')[0]);
    }
    
    setAvailableDates(dates);
    if (dates.length > 0) {
      setSelectedDate(dates[0]);
    }
  };

  const loadClassMembers = async () => {
    try {
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select('user_id, booking_date')
        .eq('class_id', selectedClassId)
        .eq('booking_date', selectedDate)
        .eq('status', 'confirmed');

      if (bookingsData && bookingsData.length > 0) {
        const userIds = bookingsData.map(b => b.user_id);
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);

        const membersWithProfiles = bookingsData.map(booking => ({
          user_id: booking.user_id,
          booking_date: booking.booking_date,
          profiles: profilesData?.find(p => p.id === booking.user_id) || {
            full_name: 'N/A',
            email: 'N/A'
          }
        }));

        setMembers(membersWithProfiles as ClassMember[]);
        // Auto-select all members
        setSelectedMembers(new Set(membersWithProfiles.map(m => m.user_id)));
      } else {
        setMembers([]);
        setSelectedMembers(new Set());
      }
    } catch (error) {
      console.error('Error loading members:', error);
      toast({
        title: 'Error',
        description: 'Failed to load class members',
        variant: 'destructive',
      });
    }
  };

  const toggleMember = (userId: string) => {
    const newSelected = new Set(selectedMembers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedMembers(newSelected);
  };

  const toggleAllMembers = () => {
    if (selectedMembers.size === members.length) {
      setSelectedMembers(new Set());
    } else {
      setSelectedMembers(new Set(members.map(m => m.user_id)));
    }
  };

  const handleSendMessage = async () => {
    if (!subject.trim() || !message.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please provide both subject and message',
        variant: 'destructive',
      });
      return;
    }

    if (selectedMembers.size === 0) {
      toast({
        title: 'No Recipients',
        description: 'Please select at least one member',
        variant: 'destructive',
      });
      return;
    }

    setSending(true);
    try {
      const selectedClass = classes.find(c => c.id === selectedClassId);
      const recipientEmails = members
        .filter(m => selectedMembers.has(m.user_id))
        .map(m => m.profiles.email);

      let successCount = 0;
      let failCount = 0;

      // Send emails one by one
      for (const email of recipientEmails) {
        try {
          const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Μήνυμα από τον Trainer</h2>
              <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0;"><strong>Τάξη:</strong> ${selectedClass?.name}</p>
                <p style="margin: 10px 0 0 0;"><strong>Ημερομηνία:</strong> ${format(new Date(selectedDate), 'EEEE, d MMMM yyyy', { locale: el })}</p>
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
            body: {
              to: email,
              subject: subject,
              html: emailHtml,
              text: message
            }
          });

          if (error) {
            console.error(`Failed to send to ${email}:`, error);
            failCount++;
          } else {
            successCount++;
          }
        } catch (error) {
          console.error(`Error sending to ${email}:`, error);
          failCount++;
        }
      }

      if (successCount > 0) {
        toast({
          title: 'Emails Sent',
          description: `Successfully sent ${successCount} email${successCount > 1 ? 's' : ''}${failCount > 0 ? ` (${failCount} failed)` : ''}`,
        });
      }

      if (failCount === recipientEmails.length) {
        toast({
          title: 'Send Failed',
          description: 'Failed to send any emails. Please check SMTP settings.',
          variant: 'destructive',
        });
      }

      // Clear form on success
      if (successCount > 0) {
        setSubject('');
        setMessage('');
      }
    } catch (error: any) {
      console.error('Error sending messages:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send messages',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Class and Date Selection */}
      <Card className="bg-gradient-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Αποστολή Μηνύματος σε Μέλη
          </CardTitle>
          <CardDescription>
            Επιλέξτε τάξη και ημερομηνία για να στείλετε μήνυμα στα μέλη
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="class-select">Τάξη</Label>
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger id="class-select">
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="date-select">Ημερομηνία</Label>
              <Select 
                value={selectedDate} 
                onValueChange={setSelectedDate}
                disabled={!selectedClassId}
              >
                <SelectTrigger id="date-select">
                  <SelectValue placeholder="Επιλέξτε ημερομηνία" />
                </SelectTrigger>
                <SelectContent>
                  {availableDates.map((date) => (
                    <SelectItem key={date} value={date}>
                      {format(new Date(date), 'EEEE, d MMMM yyyy', { locale: el })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Members Selection */}
      {members.length > 0 && (
        <Card className="bg-gradient-card border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Παραλήπτες
                </CardTitle>
                <CardDescription>
                  {selectedMembers.size} από {members.length} επιλεγμένα μέλη
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleAllMembers}
              >
                {selectedMembers.size === members.length ? 'Αποεπιλογή Όλων' : 'Επιλογή Όλων'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {members.map((member) => (
                <div
                  key={member.user_id}
                  className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <Checkbox
                    id={member.user_id}
                    checked={selectedMembers.has(member.user_id)}
                    onCheckedChange={() => toggleMember(member.user_id)}
                  />
                  <label
                    htmlFor={member.user_id}
                    className="flex-1 cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{member.profiles.full_name}</p>
                        <p className="text-sm text-muted-foreground">{member.profiles.email}</p>
                      </div>
                      {selectedMembers.has(member.user_id) && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </div>
                  </label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Message Form */}
      {members.length > 0 && (
        <Card className="bg-gradient-card border-border">
          <CardHeader>
            <CardTitle>Σύνθεση Μηνύματος</CardTitle>
            <CardDescription>
              Γράψτε το μήνυμά σας για τα επιλεγμένα μέλη
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Θέμα</Label>
              <Input
                id="subject"
                placeholder="π.χ. Υπενθύμιση για την τάξη αύριο"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Μήνυμα</Label>
              <Textarea
                id="message"
                placeholder="Γράψτε το μήνυμά σας εδώ..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={8}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Το μήνυμα θα σταλεί μέσω email σε όλα τα επιλεγμένα μέλη
              </p>
            </div>

            <div className="flex items-center gap-4">
              <Button
                onClick={handleSendMessage}
                disabled={sending || selectedMembers.size === 0 || !subject || !message}
                className="flex items-center gap-2"
              >
                <Send className="h-4 w-4" />
                {sending ? 'Αποστολή...' : `Αποστολή σε ${selectedMembers.size} μέλη`}
              </Button>
              
              {selectedMembers.size > 0 && (
                <Badge variant="outline" className="bg-primary/20 text-primary">
                  {selectedMembers.size} παραλήπτες
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {selectedClassId && selectedDate && members.length === 0 && (
        <Card className="bg-gradient-card border-border">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Δεν υπάρχουν μέλη με κρατήσεις για την επιλεγμένη ημερομηνία
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};