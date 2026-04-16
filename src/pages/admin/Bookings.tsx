import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebarAdmin } from '@/components/app-sidebar-admin';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ArrowLeft, Calendar, User, Clock, CheckCircle, XCircle, Filter, Trash2, TrendingUp, Users, BarChart3, CalendarDays } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { cn } from '@/lib/utils';
import BookingCalendar from '@/components/BookingCalendar';
import { Line, LineChart, Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

interface Booking {
  id: string;
  booking_date: string;
  status: string;
  created_at: string;
  class: {
    id: string;
    name: string;
    time: string;
    duration_minutes: number;
  };
  user: {
    id: string;
    full_name: string;
    email: string;
  };
}

export default function AdminBookings() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [selectedBookings, setSelectedBookings] = useState<Set<string>>(new Set());
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dateRangePreset, setDateRangePreset] = useState<string>('all');
  const [customDateRange, setCustomDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  const [stats, setStats] = useState({
    total: 0,
    upcoming: 0,
    cancelled: 0,
    cancellationRate: 0,
    popularClasses: [] as { name: string; count: number }[],
  });
  const [chartData, setChartData] = useState<{ date: string; confirmed: number; cancelled: number; total: number }[]>([]);
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');

  useEffect(() => {
    checkAuth();
    loadBookings();
  }, []);

  useEffect(() => {
    filterBookings();
    calculateStats();
    generateChartData();
  }, [bookings, searchQuery, statusFilter, dateRangePreset, customDateRange]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/auth');
      return;
    }

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id);

    const hasAdminRole = roleData?.some(r => r.role === 'admin');
    if (!hasAdminRole) {
      navigate('/');
      return;
    }

    setIsAdmin(true);
  };

  const loadBookings = async () => {
    setLoading(true);
    
    // First get all bookings with class info
    const { data: bookingsData, error: bookingsError } = await supabase
      .from('bookings')
      .select('*, classes(*)')
      .order('booking_date', { ascending: false });

    if (bookingsError) {
      console.error('Failed to load bookings:', bookingsError);
      toast.error('Failed to load bookings');
      setLoading(false);
      return;
    }

    // Then get user profiles
    const userIds = [...new Set(bookingsData.map(b => b.user_id))];
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', userIds);

    if (profilesError) {
      console.error('Failed to load profiles:', profilesError);
    }

    // Combine the data
    const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
    const combinedBookings = bookingsData.map(booking => ({
      id: booking.id,
      booking_date: booking.booking_date,
      status: booking.status,
      created_at: booking.created_at,
      class: {
        id: booking.classes.id,
        name: booking.classes.name,
        time: booking.classes.time,
        duration_minutes: booking.classes.duration_minutes,
      },
      user: profilesMap.get(booking.user_id) || {
        id: booking.user_id,
        full_name: 'Unknown User',
        email: 'N/A',
      },
    }));

    setBookings(combinedBookings);
    setLoading(false);
  };

  const filterBookings = () => {
    let filtered = [...bookings];

    // Filter by date range
    const dateRange = getDateRange();
    if (dateRange) {
      filtered = filtered.filter(booking => {
        const bookingDate = new Date(booking.booking_date);
        return isWithinInterval(bookingDate, { start: dateRange.from, end: dateRange.to });
      });
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(booking => 
        booking.user?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.user?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.class?.name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(booking => booking.status === statusFilter);
    }

    setFilteredBookings(filtered);
  };

  const getDateRange = (): { from: Date; to: Date } | null => {
    const now = new Date();
    
    switch (dateRangePreset) {
      case 'this_week':
        return {
          from: startOfWeek(now, { weekStartsOn: 1 }), // Monday
          to: endOfWeek(now, { weekStartsOn: 1 }),
        };
      case 'this_month':
        return {
          from: startOfMonth(now),
          to: endOfMonth(now),
        };
      case 'custom':
        if (customDateRange.from && customDateRange.to) {
          return {
            from: customDateRange.from,
            to: customDateRange.to,
          };
        }
        return null;
      case 'all':
      default:
        return null;
    }
  };

  const calculateStats = () => {
    // Use filtered bookings for stats if date range is applied
    const dataToAnalyze = dateRangePreset !== 'all' ? filteredBookings : bookings;
    const total = dataToAnalyze.length;
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // Count upcoming bookings (today and future)
    const upcoming = dataToAnalyze.filter(booking => {
      const bookingDate = new Date(booking.booking_date);
      bookingDate.setHours(0, 0, 0, 0);
      return bookingDate >= now && booking.status !== 'cancelled';
    }).length;

    // Count cancelled bookings
    const cancelled = dataToAnalyze.filter(b => b.status === 'cancelled').length;

    // Calculate cancellation rate
    const cancellationRate = total > 0 ? Math.round((cancelled / total) * 100) : 0;

    // Calculate most popular classes
    const classCount = new Map<string, number>();
    dataToAnalyze.forEach(booking => {
      if (booking.status !== 'cancelled') {
        const className = booking.class.name;
        classCount.set(className, (classCount.get(className) || 0) + 1);
      }
    });

    const popularClasses = Array.from(classCount.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    setStats({
      total,
      upcoming,
      cancelled,
      cancellationRate,
      popularClasses,
    });
  };

  const generateChartData = () => {
    const dataToAnalyze = dateRangePreset !== 'all' ? filteredBookings : bookings;
    
    // Group bookings by date
    const bookingsByDate = new Map<string, { confirmed: number; cancelled: number }>();
    
    dataToAnalyze.forEach(booking => {
      const dateKey = format(new Date(booking.booking_date), 'MMM dd');
      const existing = bookingsByDate.get(dateKey) || { confirmed: 0, cancelled: 0 };
      
      if (booking.status === 'confirmed') {
        existing.confirmed++;
      } else if (booking.status === 'cancelled') {
        existing.cancelled++;
      }
      
      bookingsByDate.set(dateKey, existing);
    });

    // Convert to array and sort by date
    const chartDataArray = Array.from(bookingsByDate.entries())
      .map(([date, counts]) => ({
        date,
        confirmed: counts.confirmed,
        cancelled: counts.cancelled,
        total: counts.confirmed + counts.cancelled,
      }))
      .sort((a, b) => {
        // Sort by actual date (parse the date string back)
        const dateA = new Date(a.date + ' 2024');
        const dateB = new Date(b.date + ' 2024');
        return dateA.getTime() - dateB.getTime();
      })
      .slice(-30); // Show last 30 days

    setChartData(chartDataArray);
  };

  const handleStatusChange = async (bookingId: string, newStatus: string) => {
    const { error } = await supabase
      .from('bookings')
      .update({ status: newStatus })
      .eq('id', bookingId);

    if (error) {
      toast.error('Failed to update booking status');
      console.error(error);
    } else {
      toast.success('Booking status updated');
      loadBookings();
    }
  };

  const handleDeleteBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to delete this booking?')) {
      return;
    }

    const { error } = await supabase
      .from('bookings')
      .delete()
      .eq('id', bookingId);

    if (error) {
      toast.error('Failed to delete booking');
      console.error(error);
    } else {
      toast.success('Booking deleted');
      loadBookings();
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedBookings(new Set(filteredBookings.map(b => b.id)));
    } else {
      setSelectedBookings(new Set());
    }
  };

  const handleSelectBooking = (bookingId: string, checked: boolean) => {
    const newSelected = new Set(selectedBookings);
    if (checked) {
      newSelected.add(bookingId);
    } else {
      newSelected.delete(bookingId);
    }
    setSelectedBookings(newSelected);
  };

  const handleBulkStatusChange = async (newStatus: string) => {
    if (selectedBookings.size === 0) {
      toast.error('Please select at least one booking');
      return;
    }

    const confirmMessage = `Are you sure you want to ${newStatus === 'cancelled' ? 'cancel' : 'confirm'} ${selectedBookings.size} booking(s)?`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    setProcessing(true);
    setProgress(0);

    const selectedIds = Array.from(selectedBookings);
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < selectedIds.length; i++) {
      const bookingId = selectedIds[i];
      
      try {
        const { error } = await supabase
          .from('bookings')
          .update({ status: newStatus })
          .eq('id', bookingId);

        if (error) throw error;
        successCount++;
      } catch (error) {
        console.error(`Failed to update booking ${bookingId}:`, error);
        errorCount++;
      }

      setProgress(((i + 1) / selectedIds.length) * 100);
    }

    setProcessing(false);
    setProgress(0);
    setSelectedBookings(new Set());

    if (successCount > 0) {
      toast.success(`Successfully updated ${successCount} booking(s)`);
    }

    if (errorCount > 0) {
      toast.error(`Failed to update ${errorCount} booking(s)`);
    }

    loadBookings();
  };

  const handleBulkDelete = async () => {
    if (selectedBookings.size === 0) {
      toast.error('Please select at least one booking');
      return;
    }

    const confirmMessage = `Are you sure you want to delete ${selectedBookings.size} booking(s)? This action cannot be undone.`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    setProcessing(true);
    setProgress(0);

    const selectedIds = Array.from(selectedBookings);
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < selectedIds.length; i++) {
      const bookingId = selectedIds[i];
      
      try {
        const { error } = await supabase
          .from('bookings')
          .delete()
          .eq('id', bookingId);

        if (error) throw error;
        successCount++;
      } catch (error) {
        console.error(`Failed to delete booking ${bookingId}:`, error);
        errorCount++;
      }

      setProgress(((i + 1) / selectedIds.length) * 100);
    }

    setProcessing(false);
    setProgress(0);
    setSelectedBookings(new Set());

    if (successCount > 0) {
      toast.success(`Successfully deleted ${successCount} booking(s)`);
    }

    if (errorCount > 0) {
      toast.error(`Failed to delete ${errorCount} booking(s)`);
    }

    loadBookings();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-green-500/20 text-green-300"><CheckCircle className="h-3 w-3 mr-1" />Confirmed</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-500/20 text-red-300"><XCircle className="h-3 w-3 mr-1" />Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const calendarEvents = bookings.map(booking => {
    const bookingDate = new Date(booking.booking_date);
    const [hours, minutes] = booking.class.time.split(':').map(Number);
    const startTime = new Date(bookingDate);
    startTime.setHours(hours, minutes, 0, 0);
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + booking.class.duration_minutes);

    return {
      id: booking.id,
      title: `${booking.class.name} - ${booking.user.full_name}`,
      start: startTime,
      end: endTime,
      resource: booking,
      status: booking.status,
    };
  });

  if (!isAdmin || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebarAdmin />
        <main className="flex-1 min-w-0">
          <div className="border-b sticky top-0 bg-background z-30">
            <div className="flex h-14 sm:h-16 items-center px-3 sm:px-6 gap-2 sm:gap-3 flex-wrap">
              <SidebarTrigger />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/admin')}
              >
                <ArrowLeft className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Back</span>
              </Button>
              <h1 className="text-base sm:text-2xl font-bold truncate">Bookings</h1>
              <div className="ml-auto flex gap-2">
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  List View
                </Button>
                <Button
                  variant={viewMode === 'calendar' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('calendar')}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Calendar View
                </Button>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Statistics Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Bookings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-3xl font-bold">{stats.total}</div>
                    <BarChart3 className="h-8 w-8 text-primary" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    All time bookings
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Upcoming Bookings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-3xl font-bold">{stats.upcoming}</div>
                    <Calendar className="h-8 w-8 text-blue-500" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Today and future
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Cancellation Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-3xl font-bold">{stats.cancellationRate}%</div>
                    <TrendingUp className={`h-8 w-8 ${stats.cancellationRate > 20 ? 'text-red-500' : 'text-green-500'}`} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {stats.cancelled} cancelled of {stats.total}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Most Popular Class
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-bold truncate">
                      {stats.popularClasses[0]?.name || 'N/A'}
                    </div>
                    <Users className="h-8 w-8 text-green-500" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {stats.popularClasses[0]?.count || 0} bookings
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Popular Classes Card */}
            {stats.popularClasses.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Top 5 Popular Classes
                  </CardTitle>
                  <CardDescription>
                    Classes with most bookings (excluding cancelled)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stats.popularClasses.map((classItem, index) => (
                      <div key={classItem.name} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary font-bold">
                            {index + 1}
                          </div>
                          <span className="font-medium">{classItem.name}</span>
                        </div>
                        <Badge variant="secondary" className="text-sm">
                          {classItem.count} bookings
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Booking Trends Chart */}
            {chartData.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        Booking Trends
                      </CardTitle>
                      <CardDescription>
                        Bookings over time (last 30 days)
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant={chartType === 'line' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setChartType('line')}
                      >
                        Line Chart
                      </Button>
                      <Button
                        variant={chartType === 'bar' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setChartType('bar')}
                      >
                        Bar Chart
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      {chartType === 'line' ? (
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis 
                            dataKey="date" 
                            className="text-xs"
                            tick={{ fill: 'hsl(var(--muted-foreground))' }}
                          />
                          <YAxis 
                            className="text-xs"
                            tick={{ fill: 'hsl(var(--muted-foreground))' }}
                          />
                          <Tooltip 
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                              color: 'hsl(var(--foreground))',
                            }}
                          />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="confirmed" 
                            stroke="hsl(142, 76%, 36%)" 
                            strokeWidth={2}
                            name="Confirmed"
                            dot={{ fill: 'hsl(142, 76%, 36%)' }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="cancelled" 
                            stroke="hsl(0, 84%, 60%)" 
                            strokeWidth={2}
                            name="Cancelled"
                            dot={{ fill: 'hsl(0, 84%, 60%)' }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="total" 
                            stroke="hsl(var(--primary))" 
                            strokeWidth={2}
                            name="Total"
                            dot={{ fill: 'hsl(var(--primary))' }}
                          />
                        </LineChart>
                      ) : (
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis 
                            dataKey="date" 
                            className="text-xs"
                            tick={{ fill: 'hsl(var(--muted-foreground))' }}
                          />
                          <YAxis 
                            className="text-xs"
                            tick={{ fill: 'hsl(var(--muted-foreground))' }}
                          />
                          <Tooltip 
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                              color: 'hsl(var(--foreground))',
                            }}
                          />
                          <Legend />
                          <Bar 
                            dataKey="confirmed" 
                            fill="hsl(142, 76%, 36%)" 
                            name="Confirmed"
                          />
                          <Bar 
                            dataKey="cancelled" 
                            fill="hsl(0, 84%, 60%)" 
                            name="Cancelled"
                          />
                        </BarChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                    <div className="p-3 bg-green-500/10 rounded-lg">
                      <p className="text-sm text-muted-foreground">Confirmed</p>
                      <p className="text-2xl font-bold text-green-500">
                        {chartData.reduce((sum, day) => sum + day.confirmed, 0)}
                      </p>
                    </div>
                    <div className="p-3 bg-red-500/10 rounded-lg">
                      <p className="text-sm text-muted-foreground">Cancelled</p>
                      <p className="text-2xl font-bold text-red-500">
                        {chartData.reduce((sum, day) => sum + day.cancelled, 0)}
                      </p>
                    </div>
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <p className="text-sm text-muted-foreground">Total</p>
                      <p className="text-2xl font-bold text-primary">
                        {chartData.reduce((sum, day) => sum + day.total, 0)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Bulk Actions */}
            {viewMode === 'list' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    Bulk Actions
                  </CardTitle>
                  <CardDescription>
                    Select multiple bookings and perform actions
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4 flex-wrap">
                    <Button
                      onClick={() => handleBulkStatusChange('confirmed')}
                      disabled={processing || selectedBookings.size === 0}
                      className="flex-1"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Confirm Selected ({selectedBookings.size})
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleBulkStatusChange('cancelled')}
                      disabled={processing || selectedBookings.size === 0}
                      className="flex-1"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Cancel Selected ({selectedBookings.size})
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleBulkDelete}
                      disabled={processing || selectedBookings.size === 0}
                      className="flex-1"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Selected ({selectedBookings.size})
                    </Button>
                  </div>

                  {processing && (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Processing...</p>
                      <Progress value={progress} className="w-full" />
                    </div>
                  )}

                  {selectedBookings.size > 0 && (
                    <Alert>
                      <AlertDescription>
                        {selectedBookings.size} booking(s) selected
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filters
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Date Range</label>
                    <Select value={dateRangePreset} onValueChange={(value) => {
                      setDateRangePreset(value);
                      if (value !== 'custom') {
                        setCustomDateRange({ from: undefined, to: undefined });
                      }
                    }}>
                      <SelectTrigger className="bg-secondary border-border">
                        <SelectValue placeholder="Select date range" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Time</SelectItem>
                        <SelectItem value="this_week">This Week</SelectItem>
                        <SelectItem value="this_month">This Month</SelectItem>
                        <SelectItem value="custom">Custom Range</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {dateRangePreset === 'custom' && (
                    <>
                      <div>
                        <label className="text-sm font-medium mb-2 block">From Date</label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal bg-secondary border-border",
                                !customDateRange.from && "text-muted-foreground"
                              )}
                            >
                              <CalendarDays className="mr-2 h-4 w-4" />
                              {customDateRange.from ? format(customDateRange.from, "PPP") : "Pick a date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={customDateRange.from}
                              onSelect={(date) => setCustomDateRange(prev => ({ ...prev, from: date }))}
                              initialFocus
                              className="pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">To Date</label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal bg-secondary border-border",
                                !customDateRange.to && "text-muted-foreground"
                              )}
                            >
                              <CalendarDays className="mr-2 h-4 w-4" />
                              {customDateRange.to ? format(customDateRange.to, "PPP") : "Pick a date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={customDateRange.to}
                              onSelect={(date) => setCustomDateRange(prev => ({ ...prev, to: date }))}
                              disabled={(date) => customDateRange.from ? date < customDateRange.from : false}
                              initialFocus
                              className="pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium">Search</label>
                      {viewMode === 'list' && (
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={selectedBookings.size === filteredBookings.length && filteredBookings.length > 0}
                            onCheckedChange={handleSelectAll}
                          />
                          <span className="text-xs text-muted-foreground">Select All</span>
                        </div>
                      )}
                    </div>
                    <Input
                      type="text"
                      placeholder="Search by user, email, or class..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-secondary border-border"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Status</label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="bg-secondary border-border">
                        <SelectValue placeholder="All statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  Showing {filteredBookings.length} of {bookings.length} bookings
                  {dateRangePreset !== 'all' && (
                    <span className="ml-2 text-primary">
                      ({dateRangePreset === 'custom' && customDateRange.from && customDateRange.to
                        ? `${format(customDateRange.from, 'PP')} - ${format(customDateRange.to, 'PP')}`
                        : dateRangePreset === 'this_week' 
                        ? 'This Week' 
                        : 'This Month'})
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Content */}
            {viewMode === 'calendar' ? (
              <Card>
                <CardHeader>
                  <CardTitle>Calendar View</CardTitle>
                  <CardDescription>View all bookings in calendar format</CardDescription>
                </CardHeader>
                <CardContent>
                  <BookingCalendar events={calendarEvents} />
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>All Bookings</CardTitle>
                  <CardDescription>Manage all gym bookings</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {filteredBookings.map((booking) => (
                      <div
                        key={booking.id}
                        className="flex items-center gap-3 p-4 border border-border rounded-lg hover:bg-secondary/50 transition-colors"
                      >
                        <Checkbox
                          checked={selectedBookings.has(booking.id)}
                          onCheckedChange={(checked) => handleSelectBooking(booking.id, checked as boolean)}
                        />
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold">{booking.class.name}</h3>
                            {getStatusBadge(booking.status)}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <User className="h-4 w-4" />
                              {booking.user.full_name} ({booking.user.email})
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {new Date(booking.booking_date).toLocaleDateString()}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {booking.class.time} ({booking.class.duration_minutes} min)
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Select
                            value={booking.status}
                            onValueChange={(value) => handleStatusChange(booking.id, value)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="confirmed">Confirmed</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteBooking(booking.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}

                    {filteredBookings.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">
                        No bookings found
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
