import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Save, Trash2, UserPlus } from 'lucide-react';
import ImageUpload from '@/components/ImageUpload';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebarAdmin } from "@/components/app-sidebar-admin";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Trainer {
  id: string;
  name: string;
  specialization?: string;
  bio?: string;
  image_url?: string;
}

export default function TrainerManager() {
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTrainer, setNewTrainer] = useState<Partial<Trainer>>({
    name: '',
    specialization: '',
    bio: '',
    image_url: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    loadTrainers();
  }, []);

  const loadTrainers = async () => {
    try {
      const { data, error } = await supabase
        .from('trainers')
        .select('*')
        .order('name');

      if (error) throw error;

      if (data) {
        setTrainers(data);
      }
    } catch (error: any) {
      toast({
        title: 'Error loading trainers',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTrainer = async () => {
    if (!newTrainer.name) {
      toast({
        title: 'Name required',
        description: 'Please enter a trainer name',
        variant: 'destructive',
      });
      return;
    }

    setSaving('new');
    try {
      const { error } = await supabase
        .from('trainers')
        .insert([{
          name: newTrainer.name,
          specialization: newTrainer.specialization || null,
          bio: newTrainer.bio || null,
          image_url: newTrainer.image_url || null,
        }]);

      if (error) throw error;

      toast({
        title: 'Trainer created',
        description: 'New trainer has been added',
      });

      setDialogOpen(false);
      setNewTrainer({ name: '', specialization: '', bio: '', image_url: '' });
      loadTrainers();
    } catch (error: any) {
      toast({
        title: 'Error creating trainer',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(null);
    }
  };

  const handleUpdateTrainer = async (trainer: Trainer) => {
    setSaving(trainer.id);
    try {
      const { error } = await supabase
        .from('trainers')
        .update({
          name: trainer.name,
          specialization: trainer.specialization,
          bio: trainer.bio,
          image_url: trainer.image_url,
        })
        .eq('id', trainer.id);

      if (error) throw error;

      toast({
        title: 'Trainer updated',
        description: 'Changes have been saved',
      });
    } catch (error: any) {
      toast({
        title: 'Error updating trainer',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(null);
    }
  };

  const handleDeleteTrainer = async (id: string) => {
    if (!confirm('Are you sure you want to delete this trainer?')) return;

    try {
      const { error } = await supabase
        .from('trainers')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Trainer deleted',
        description: 'Trainer has been removed',
      });

      loadTrainers();
    } catch (error: any) {
      toast({
        title: 'Error deleting trainer',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const updateTrainerField = (id: string, field: keyof Trainer, value: any) => {
    setTrainers(prev =>
      prev.map(trainer =>
        trainer.id === id ? { ...trainer, [field]: value } : trainer
      )
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebarAdmin />
        
        <div className="flex-1 min-w-0">
          <header className="h-14 sm:h-16 border-b border-border flex items-center px-3 sm:px-6 sticky top-0 bg-background z-30">
            <SidebarTrigger />
            <h1 className="ml-2 sm:ml-4 text-lg sm:text-2xl font-bold truncate">Trainer Management</h1>
          </header>

          <main className="p-3 sm:p-6">
            <div className="max-w-6xl mx-auto">
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Trainer Management</h2>
          <p className="text-muted-foreground">Manage trainer profiles and bios</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Add Trainer
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Trainer</DialogTitle>
              <DialogDescription>Create a new trainer profile</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={newTrainer.name}
                  onChange={(e) => setNewTrainer({ ...newTrainer, name: e.target.value })}
                  placeholder="John Doe"
                />
              </div>

              <div className="space-y-2">
                <Label>Specialization</Label>
                <Input
                  value={newTrainer.specialization}
                  onChange={(e) => setNewTrainer({ ...newTrainer, specialization: e.target.value })}
                  placeholder="Strength Training, Yoga, etc."
                />
              </div>

              <div className="space-y-2">
                <Label>Bio</Label>
                <Textarea
                  value={newTrainer.bio}
                  onChange={(e) => setNewTrainer({ ...newTrainer, bio: e.target.value })}
                  placeholder="Trainer biography..."
                  rows={4}
                />
              </div>

              <ImageUpload
                currentImageUrl={newTrainer.image_url}
                onImageUploaded={(url) => setNewTrainer({ ...newTrainer, image_url: url })}
                folder="trainers"
              />

              <Button
                onClick={handleCreateTrainer}
                disabled={saving === 'new'}
                className="w-full"
              >
                {saving === 'new' ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating...</>
                ) : (
                  <><Plus className="h-4 w-4 mr-2" /> Create Trainer</>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6">
        {trainers.map((trainer) => (
          <Card key={trainer.id} className="bg-gradient-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{trainer.name}</span>
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => handleDeleteTrainer(trainer.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardTitle>
              {trainer.specialization && (
                <CardDescription>{trainer.specialization}</CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={trainer.name}
                  onChange={(e) => updateTrainerField(trainer.id, 'name', e.target.value)}
                  className="bg-secondary border-border"
                />
              </div>

              <div className="space-y-2">
                <Label>Specialization</Label>
                <Input
                  value={trainer.specialization || ''}
                  onChange={(e) => updateTrainerField(trainer.id, 'specialization', e.target.value)}
                  className="bg-secondary border-border"
                />
              </div>

              <div className="space-y-2">
                <Label>Bio</Label>
                <Textarea
                  value={trainer.bio || ''}
                  onChange={(e) => updateTrainerField(trainer.id, 'bio', e.target.value)}
                  rows={4}
                  className="bg-secondary border-border"
                />
              </div>

              <ImageUpload
                currentImageUrl={trainer.image_url}
                onImageUploaded={(url) => updateTrainerField(trainer.id, 'image_url', url)}
                folder="trainers"
              />

              <Button
                onClick={() => handleUpdateTrainer(trainer)}
                disabled={saving === trainer.id}
              >
                {saving === trainer.id ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
                ) : (
                  <><Save className="h-4 w-4 mr-2" /> Save Changes</>
                )}
              </Button>
            </CardContent>
          </Card>
        ))}

        {trainers.length === 0 && (
          <Card className="bg-gradient-card border-border">
            <CardContent className="pt-6 text-center text-muted-foreground">
              <p>No trainers yet. Add your first trainer above.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
