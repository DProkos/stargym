import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebarTrainer } from "@/components/app-sidebar-trainer";
import { TrainerBookingManager } from '@/components/trainer/TrainerBookingManager';

export default function TrainerBookings() {
  const [loading, setLoading] = useState(true);
  const [trainerId, setTrainerId] = useState<string | null>(null);

  useEffect(() => {
    loadTrainerId();
  }, []);

  const loadTrainerId = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      setTrainerId(session.user.id);
    } catch (error) {
      console.error('Error loading trainer ID:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!trainerId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Unable to load trainer information</p>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebarTrainer />
        
        <div className="flex-1">
          <header className="h-16 border-b border-border flex items-center px-6">
            <SidebarTrigger />
            <h1 className="ml-4 text-2xl font-bold">Διαχείριση Κρατήσεων</h1>
          </header>

          <main className="p-6">
            <TrainerBookingManager trainerId={trainerId} />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}