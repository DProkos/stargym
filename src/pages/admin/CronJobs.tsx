import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebarAdmin } from "@/components/app-sidebar-admin";
import { 
  Clock, 
  Play, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Calendar,
  Terminal,
  Save
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

interface CronJob {
  jobid: number;
  schedule: string;
  command: string;
  nodename: string;
  nodeport: number;
  database: string;
  username: string;
  active: boolean;
  jobname: string;
}

export default function CronJobs() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [cronJobs, setCronJobs] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [logs, setLogs] = useState<string>('');
  const [showLogsDialog, setShowLogsDialog] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<number | null>(null);
  const [newSchedule, setNewSchedule] = useState('');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/auth');
      return;
    }

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .eq('role', 'admin')
      .single();

    if (!roleData) {
      navigate('/');
      return;
    }

    loadCronJobs();
  };

  const loadCronJobs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .rpc('get_cron_jobs');

      if (error) {
        console.error('Error loading cron jobs:', error);
        toast({
          title: 'Error',
          description: 'Failed to load cron jobs',
          variant: 'destructive',
        });
      } else {
        setCronJobs(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleManualExecution = async () => {
    setExecuting(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-class-reminders', {
        body: {}
      });

      if (error) {
        throw error;
      }

      toast({
        title: 'Execution Started',
        description: 'The reminder job has been triggered successfully',
      });

      // Show result
      setLogs(JSON.stringify(data, null, 2));
      setShowLogsDialog(true);
    } catch (error: any) {
      console.error('Execution error:', error);
      toast({
        title: 'Execution Failed',
        description: error.message || 'Failed to execute the job',
        variant: 'destructive',
      });
    } finally {
      setExecuting(false);
    }
  };

  const handleUpdateSchedule = async (jobId: number, schedule: string) => {
    try {
      const { error } = await supabase
        .rpc('update_cron_schedule', {
          job_id: jobId,
          new_schedule: schedule
        });

      if (error) {
        throw error;
      }

      toast({
        title: 'Schedule Updated',
        description: 'The cron schedule has been updated successfully',
      });

      setEditingSchedule(null);
      loadCronJobs();
    } catch (error: any) {
      console.error('Update error:', error);
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update schedule',
        variant: 'destructive',
      });
    }
  };

  const parseCronSchedule = (schedule: string): string => {
    const parts = schedule.split(' ');
    if (parts.length !== 5) return schedule;

    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
    
    if (minute === '0' && hour === '9' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
      return 'Κάθε μέρα στις 9:00 πμ';
    }
    
    return `${hour}:${minute} ${dayOfWeek === '*' ? 'καθημερινά' : `μέρα ${dayOfWeek}`}`;
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebarAdmin />
        
        <div className="flex-1">
          <header className="h-16 border-b border-border flex items-center px-6">
            <SidebarTrigger />
            <h1 className="ml-4 text-2xl font-bold">Cron Jobs Management</h1>
          </header>

          <main className="p-6">
            <div className="max-w-6xl mx-auto space-y-6">
              {/* Overview Card */}
              <Card className="bg-gradient-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    Automated Tasks Overview
                  </CardTitle>
                  <CardDescription>
                    Manage scheduled tasks and email reminders
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="flex items-center gap-3 p-4 border border-border rounded-lg">
                      <CheckCircle className="h-8 w-8 text-green-500" />
                      <div>
                        <p className="text-2xl font-bold">{cronJobs.filter(j => j.active).length}</p>
                        <p className="text-sm text-muted-foreground">Active Jobs</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-4 border border-border rounded-lg">
                      <XCircle className="h-8 w-8 text-muted-foreground" />
                      <div>
                        <p className="text-2xl font-bold">{cronJobs.filter(j => !j.active).length}</p>
                        <p className="text-sm text-muted-foreground">Inactive Jobs</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-4 border border-border rounded-lg">
                      <Calendar className="h-8 w-8 text-primary" />
                      <div>
                        <p className="text-2xl font-bold">{cronJobs.length}</p>
                        <p className="text-sm text-muted-foreground">Total Jobs</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Cron Jobs List */}
              {loading ? (
                <Card className="bg-gradient-card border-border">
                  <CardContent className="pt-6">
                    <p className="text-center text-muted-foreground">Φόρτωση...</p>
                  </CardContent>
                </Card>
              ) : cronJobs.length === 0 ? (
                <Card className="bg-gradient-card border-border">
                  <CardContent className="pt-6">
                    <p className="text-center text-muted-foreground">Δεν βρέθηκαν cron jobs</p>
                  </CardContent>
                </Card>
              ) : (
                cronJobs.map((job) => (
                  <Card key={job.jobid} className="bg-gradient-card border-border">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <Terminal className="h-5 w-5 text-primary" />
                            {job.jobname || `Job #${job.jobid}`}
                          </CardTitle>
                          <CardDescription className="mt-2">
                            {parseCronSchedule(job.schedule)}
                          </CardDescription>
                        </div>
                        <Badge 
                          variant="outline" 
                          className={job.active 
                            ? "bg-green-500/20 text-green-600 border-green-500"
                            : "bg-muted/20 text-muted-foreground"
                          }
                        >
                          {job.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Schedule Editor */}
                      {editingSchedule === job.jobid ? (
                        <div className="space-y-3 p-4 border border-border rounded-lg bg-muted/20">
                          <Label htmlFor={`schedule-${job.jobid}`}>
                            Cron Schedule (format: minute hour day month dayofweek)
                          </Label>
                          <div className="flex gap-2">
                            <Input
                              id={`schedule-${job.jobid}`}
                              value={newSchedule}
                              onChange={(e) => setNewSchedule(e.target.value)}
                              placeholder="0 9 * * *"
                              className="font-mono"
                            />
                            <Button
                              onClick={() => handleUpdateSchedule(job.jobid, newSchedule)}
                              size="sm"
                              className="flex items-center gap-2"
                            >
                              <Save className="h-4 w-4" />
                              Save
                            </Button>
                            <Button
                              onClick={() => setEditingSchedule(null)}
                              size="sm"
                              variant="outline"
                            >
                              Cancel
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Παραδείγματα: "0 9 * * *" = Κάθε μέρα στις 9πμ, "30 8 * * *" = Κάθε μέρα στις 8:30πμ
                          </p>
                        </div>
                      ) : (
                        <div className="flex items-center gap-4">
                          <div className="flex-1">
                            <Label className="text-sm text-muted-foreground">Χρονοδιάγραμμα</Label>
                            <p className="font-mono text-sm mt-1">{job.schedule}</p>
                          </div>
                          <Button
                            onClick={() => {
                              setEditingSchedule(job.jobid);
                              setNewSchedule(job.schedule);
                            }}
                            size="sm"
                            variant="outline"
                          >
                            Επεξεργασία
                          </Button>
                        </div>
                      )}

                      {/* Command Display */}
                      <div>
                        <Label className="text-sm text-muted-foreground">Command</Label>
                        <Textarea
                          value={job.command}
                          readOnly
                          className="mt-1 font-mono text-xs h-20 resize-none"
                        />
                      </div>

                      {/* Actions */}
                      {job.jobname === 'send-class-reminders-daily' && (
                        <div className="flex gap-3 pt-4 border-t border-border">
                          <Button
                            onClick={handleManualExecution}
                            disabled={executing}
                            className="flex items-center gap-2"
                          >
                            <Play className="h-4 w-4" />
                            {executing ? 'Εκτέλεση...' : 'Manual Execution'}
                          </Button>
                          <Button
                            onClick={loadCronJobs}
                            variant="outline"
                            className="flex items-center gap-2"
                          >
                            <RefreshCw className="h-4 w-4" />
                            Ανανέωση
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Logs Dialog */}
      <Dialog open={showLogsDialog} onOpenChange={setShowLogsDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Terminal className="h-5 w-5 text-primary" />
              Execution Logs
            </DialogTitle>
            <DialogDescription>
              Results from the manual execution
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <Textarea
              value={logs}
              readOnly
              className="font-mono text-xs h-96 resize-none bg-muted"
            />
          </div>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}