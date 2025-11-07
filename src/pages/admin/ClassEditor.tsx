import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebarAdmin } from "@/components/app-sidebar-admin";

interface Class {
  id: string;
  name: string;
  description?: string;
  time: string;
  day_of_week: number;
  duration_minutes: number;
  max_capacity: number;
  trainer: {
    name: string;
  } | null;
}

export default function ClassEditor() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const { toast } = useToast();

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select(`
          *,
          trainer:trainers(name)
        `)
        .order('day_of_week')
        .order('time');

      if (error) throw error;

      if (data) {
        setClasses(data);
      }
    } catch (error: any) {
      toast({
        title: 'Error loading classes',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateClass = async (classItem: Class) => {
    setSaving(classItem.id);
    try {
      const { error } = await supabase
        .from('classes')
        .update({
          description: classItem.description,
        })
        .eq('id', classItem.id);

      if (error) throw error;

      toast({
        title: 'Class updated',
        description: 'Description has been saved',
      });
    } catch (error: any) {
      toast({
        title: 'Error updating class',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(null);
    }
  };

  const updateClassDescription = (id: string, description: string) => {
    setClasses(prev =>
      prev.map(cls =>
        cls.id === id ? { ...cls, description } : cls
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
        
        <div className="flex-1">
          <header className="h-16 border-b border-border flex items-center px-6">
            <SidebarTrigger />
            <h1 className="ml-4 text-2xl font-bold">Class Descriptions</h1>
          </header>

          <main className="p-6">
            <div className="max-w-4xl mx-auto">
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Class Descriptions</h2>
        <p className="text-muted-foreground">Edit class descriptions and details</p>
      </div>

      <div className="grid gap-6">
        {classes.map((classItem) => (
          <Card key={classItem.id} className="bg-gradient-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{classItem.name}</span>
                <div className="flex gap-2">
                  <Badge variant="outline" className="bg-primary/20 text-primary border-primary">
                    {daysOfWeek[classItem.day_of_week]}
                  </Badge>
                  <Badge variant="outline">
                    {classItem.time}
                  </Badge>
                </div>
              </CardTitle>
              <CardDescription>
                {classItem.duration_minutes} minutes • Max {classItem.max_capacity} people
                {classItem.trainer && ` • Trainer: ${classItem.trainer.name}`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={classItem.description || ''}
                  onChange={(e) => updateClassDescription(classItem.id, e.target.value)}
                  placeholder="Add a description for this class..."
                  rows={4}
                  className="bg-secondary border-border"
                />
                <p className="text-sm text-muted-foreground">
                  Describe what students can expect from this class
                </p>
              </div>

              <Button
                onClick={() => handleUpdateClass(classItem)}
                disabled={saving === classItem.id}
              >
                {saving === classItem.id ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
                ) : (
                  <><Save className="h-4 w-4 mr-2" /> Save Description</>
                )}
              </Button>
            </CardContent>
          </Card>
        ))}

        {classes.length === 0 && (
          <Card className="bg-gradient-card border-border">
            <CardContent className="pt-6 text-center text-muted-foreground">
              <p>No classes available yet.</p>
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
