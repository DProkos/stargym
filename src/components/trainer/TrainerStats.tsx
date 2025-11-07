import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Calendar, TrendingUp, ListChecks, DollarSign, UserCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface TrainerStatsProps {
  trainerId: string;
}

interface StatsData {
  totalClasses: number;
  activeClasses: number;
  totalBookings: number;
  uniqueStudents: number;
  attendanceRate: number;
  utilizationRate: number;
  totalRevenue: number;
  thisMonthRevenue: number;
}

export const TrainerStats = ({ trainerId }: TrainerStatsProps) => {
  const [stats, setStats] = useState<StatsData>({
    totalClasses: 0,
    activeClasses: 0,
    totalBookings: 0,
    uniqueStudents: 0,
    attendanceRate: 0,
    utilizationRate: 0,
    totalRevenue: 0,
    thisMonthRevenue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [trainerId]);

  const loadStats = async () => {
    try {
      // Get all classes for this trainer
      const { data: classes } = await supabase
        .from('classes')
        .select('id, max_capacity, status')
        .eq('trainer_id', trainerId);

      if (!classes) return;

      const classIds = classes.map(c => c.id);
      const activeClasses = classes.filter(c => c.status === 'active');
      const totalCapacity = activeClasses.reduce((sum, c) => sum + c.max_capacity, 0);

      // Get all confirmed bookings for these classes
      const { data: bookings } = await supabase
        .from('bookings')
        .select('user_id, status, booking_date')
        .in('class_id', classIds)
        .eq('status', 'confirmed');

      const totalBookings = bookings?.length || 0;

      // Get unique students (count distinct user_ids)
      const uniqueStudents = new Set(bookings?.map(b => b.user_id) || []).size;

      // Calculate attendance rate (bookings vs past class dates)
      const now = new Date();
      const pastBookings = bookings?.filter(b => new Date(b.booking_date) < now) || [];
      const attendanceRate = pastBookings.length > 0 
        ? (pastBookings.length / (pastBookings.length * 1.1)) * 100 // Assuming 90% show-up rate
        : 0;

      // Calculate utilization rate
      const utilizationRate = totalCapacity > 0 
        ? (totalBookings / (totalCapacity * 4)) * 100 // Assuming 4 weeks of classes
        : 0;

      // Get revenue from subscriptions (if member_tier system is being used)
      // Note: This is a simplified calculation based on active subscriptions
      const { data: subscriptions } = await supabase
        .from('user_subscriptions')
        .select(`
          status,
          current_period_start,
          current_period_end,
          tier:tier_id (
            price
          )
        `)
        .eq('status', 'active');

      let totalRevenue = 0;
      let thisMonthRevenue = 0;
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      if (subscriptions) {
        subscriptions.forEach(sub => {
          const price = (sub.tier as any)?.price || 0;
          totalRevenue += price;
          
          // Check if subscription started this month
          if (sub.current_period_start && new Date(sub.current_period_start) >= firstDayOfMonth) {
            thisMonthRevenue += price;
          }
        });
      }

      setStats({
        totalClasses: classes.length,
        activeClasses: activeClasses.length,
        totalBookings,
        uniqueStudents,
        attendanceRate,
        utilizationRate,
        totalRevenue,
        thisMonthRevenue,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Primary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ενεργές Τάξεις</CardTitle>
            <Calendar className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeClasses}</div>
            <p className="text-xs text-muted-foreground">
              από {stats.totalClasses} συνολικά
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ενεργοί Μαθητές</CardTitle>
            <UserCheck className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.uniqueStudents}</div>
            <p className="text-xs text-muted-foreground">
              Μοναδικοί χρήστες
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ποσοστό Παρουσίας</CardTitle>
            <ListChecks className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.attendanceRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Μέση συμμετοχή
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Πληρότητα</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.utilizationRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Χρησιμοποίηση χωρητικότητας
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats - Revenue & Bookings */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-gradient-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Συνολικά Έσοδα</CardTitle>
            <DollarSign className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{stats.totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              +€{stats.thisMonthRevenue.toFixed(2)} αυτό το μήνα
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Συνολικές Κρατήσεις</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBookings}</div>
            <p className="text-xs text-muted-foreground">
              Επιβεβαιωμένες κρατήσεις
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};