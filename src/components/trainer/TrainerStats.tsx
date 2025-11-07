import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Calendar, TrendingUp, ListChecks } from 'lucide-react';

interface TrainerStatsProps {
  totalClasses: number;
  totalBookings: number;
  totalCapacity: number;
  averageAttendance: number;
}

export const TrainerStats = ({ 
  totalClasses, 
  totalBookings, 
  totalCapacity,
  averageAttendance 
}: TrainerStatsProps) => {
  const utilizationRate = totalCapacity > 0 ? ((totalBookings / totalCapacity) * 100).toFixed(1) : 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="bg-gradient-card border-border">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Τάξεις</CardTitle>
          <Calendar className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalClasses}</div>
          <p className="text-xs text-muted-foreground">
            Ενεργές τάξεις
          </p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-card border-border">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Κρατήσεις</CardTitle>
          <Users className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalBookings}</div>
          <p className="text-xs text-muted-foreground">
            Σύνολο κρατήσεων
          </p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-card border-border">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Πληρότητα</CardTitle>
          <TrendingUp className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{utilizationRate}%</div>
          <p className="text-xs text-muted-foreground">
            Ποσοστό χρησιμοποίησης
          </p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-card border-border">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Παρουσία</CardTitle>
          <ListChecks className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{averageAttendance.toFixed(1)}%</div>
          <p className="text-xs text-muted-foreground">
            Μέση παρουσία
          </p>
        </CardContent>
      </Card>
    </div>
  );
};