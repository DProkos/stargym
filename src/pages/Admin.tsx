import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Calendar, BookOpen, CalendarDays } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebarAdmin } from "@/components/app-sidebar-admin";
import BookingCalendar from '@/components/BookingCalendar';
import { MemberRow } from '@/components/MemberRow';
import { RecentActivityWidget } from '@/components/admin/RecentActivityWidget';

export default function Admin() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState({
    members: 0,
    classes: 0,
    bookings: 0,
  });
  const [members, setMembers] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return;
      }

      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id);

      const hasAdminRole = data?.some(r => r.role === 'admin');
      if (!hasAdminRole) {
        navigate('/');
        return;
      }

      setUser(session.user);
      setIsAdmin(true);
      loadData();
    };

    checkAdmin();
  }, [navigate]);

  const loadData = async () => {
    const [membersData, classesData, bookingsData] = await Promise.all([
      supabase.from('profiles').select('*'),
      supabase.from('classes').select('*, trainer:trainers(name)'),
      supabase.from('bookings').select('*, class:classes(name), user:profiles(full_name)'),
    ]);

    if (membersData.data) {
      setMembers(membersData.data);
      setStats((prev) => ({ ...prev, members: membersData.data.length }));
    }

    if (classesData.data) {
      setClasses(classesData.data);
      setStats((prev) => ({ ...prev, classes: classesData.data.length }));
    }

    if (bookingsData.data) {
      setBookings(bookingsData.data);
      setStats((prev) => ({ ...prev, bookings: bookingsData.data.length }));
    }
  };

  // Calendar events from bookings
  const calendarEvents = bookings.map(booking => {
    const bookingDate = new Date(booking.booking_date);
    const classTime = booking.class?.time || '09:00';
    const [hours, minutes] = classTime.split(':').map(Number);
    const startTime = new Date(bookingDate);
    startTime.setHours(hours, minutes, 0);
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + 60); // Default 60 min if no duration

    return {
      id: booking.id,
      title: `${booking.class?.name || 'Class'} - ${booking.user?.full_name || 'User'}`,
      start: startTime,
      end: endTime,
      resource: booking,
      status: booking.status,
    };
  });

  if (!isAdmin) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebarAdmin />
        
        <div className="flex-1">
          <header className="h-16 border-b border-border flex items-center px-6">
            <SidebarTrigger />
            <h1 className="ml-4 text-2xl font-bold">{t('admin.dashboard')}</h1>
          </header>

          <main className="p-6">
            <div className="max-w-7xl mx-auto space-y-6">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {t('dashboard.overview')}
            </h1>
          </div>

          {/* Recent Activity Widget */}
          <RecentActivityWidget />

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <Card className="bg-gradient-card border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{t('dashboard.members')}</CardTitle>
                <Users className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.members}</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{t('dashboard.classes')}</CardTitle>
                <Calendar className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.classes}</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{t('dashboard.bookings')}</CardTitle>
                <BookOpen className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.bookings}</div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="members" className="w-full">
            <TabsList className="grid w-full md:w-auto grid-cols-4">
              <TabsTrigger value="calendar" className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                Calendar
              </TabsTrigger>
              <TabsTrigger value="members">{t('dashboard.members')}</TabsTrigger>
              <TabsTrigger value="classes">{t('dashboard.classes')}</TabsTrigger>
              <TabsTrigger value="bookings">{t('dashboard.bookings')}</TabsTrigger>
            </TabsList>

            <TabsContent value="calendar" className="mt-6">
              <BookingCalendar 
                events={calendarEvents}
                defaultView="month"
              />
            </TabsContent>

            <TabsContent value="members" className="mt-6">
              <Card className="bg-gradient-card border-border">
                <CardHeader>
                  <CardTitle>{t('dashboard.manageMembers')}</CardTitle>
                  <CardDescription>View and manage all gym members and their roles</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {members.map((member) => (
                      <MemberRow key={member.id} member={member} onRoleUpdate={loadData} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="classes" className="mt-6">
              <Card className="bg-gradient-card border-border">
                <CardHeader>
                  <CardTitle>{t('dashboard.manageClasses')}</CardTitle>
                  <CardDescription>View and manage all classes</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {classes.map((classItem) => (
                      <div key={classItem.id} className="flex items-center justify-between p-4 bg-secondary rounded-lg">
                        <div>
                          <p className="font-semibold">{classItem.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {classItem.trainer?.name || 'No trainer'} - {classItem.time}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="bookings" className="mt-6">
              <Card className="bg-gradient-card border-border">
                <CardHeader>
                  <CardTitle>{t('dashboard.viewBookings')}</CardTitle>
                  <CardDescription>View all member bookings</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {bookings.map((booking) => (
                      <div key={booking.id} className="flex items-center justify-between p-4 bg-secondary rounded-lg">
                        <div>
                          <p className="font-semibold">{booking.class.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {booking.user.full_name} - {new Date(booking.booking_date).toLocaleDateString()}
                          </p>
                        </div>
                        <span className={`text-sm px-3 py-1 rounded-full ${
                          booking.status === 'confirmed' 
                            ? 'bg-primary/20 text-primary' 
                            : 'bg-destructive/20 text-destructive'
                        }`}>
                          {booking.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}