import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Shield, UserPlus, UserMinus, Settings, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ActivityLog {
  id: string;
  action_type: string;
  admin_id: string;
  target_user_id: string | null;
  details: any; // Using any for JSONB flexibility
  created_at: string;
}

export function RecentActivityWidget() {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivities();
    setupRealtimeSubscription();
  }, []);

  const loadActivities = async () => {
    const { data, error } = await supabase
      .from('admin_activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Failed to load activities:', error);
    } else {
      setActivities(data || []);
    }
    setLoading(false);
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('admin-activity-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'admin_activity_log'
        },
        (payload) => {
          const newActivity = payload.new as ActivityLog;
          setActivities((current) => [newActivity, ...current].slice(0, 20));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const getActivityIcon = (actionType: string) => {
    switch (actionType) {
      case 'role_added':
        return <UserPlus className="h-4 w-4 text-green-500" />;
      case 'role_removed':
        return <UserMinus className="h-4 w-4 text-red-500" />;
      case 'settings_changed':
        return <Settings className="h-4 w-4 text-blue-500" />;
      default:
        return <Shield className="h-4 w-4 text-gray-500" />;
    }
  };

  const getActivityColor = (actionType: string) => {
    switch (actionType) {
      case 'role_added':
        return 'bg-green-500/20 text-green-300';
      case 'role_removed':
        return 'bg-red-500/20 text-red-300';
      case 'settings_changed':
        return 'bg-blue-500/20 text-blue-300';
      default:
        return 'bg-gray-500/20 text-gray-300';
    }
  };

  const formatActivityMessage = (activity: ActivityLog) => {
    const { action_type, details } = activity;
    
    switch (action_type) {
      case 'role_added':
        return (
          <>
            <span className="font-medium">{details.admin_email || 'Admin'}</span>
            {' added '}
            <Badge className={`mx-1 ${getActivityColor(action_type)}`}>
              {details.role}
            </Badge>
            {' role to '}
            <span className="font-medium">{details.user_email || 'user'}</span>
          </>
        );
      case 'role_removed':
        return (
          <>
            <span className="font-medium">{details.admin_email || 'Admin'}</span>
            {' removed '}
            <Badge className={`mx-1 ${getActivityColor(action_type)}`}>
              {details.role}
            </Badge>
            {' role from '}
            <span className="font-medium">{details.user_email || 'user'}</span>
          </>
        );
      case 'settings_changed':
        return (
          <>
            <span className="font-medium">{details.admin_email || 'Admin'}</span>
            {' changed '}
            <span className="font-medium">{details.setting_name}</span>
          </>
        );
      default:
        return (
          <>
            <span className="font-medium">{details.admin_email || 'Admin'}</span>
            {' performed action: '}
            <span className="font-medium">{action_type}</span>
          </>
        );
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Activity
          </CardTitle>
          <CardDescription>Loading recent admin activities...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Recent Activity
          {activities.length > 0 && (
            <Badge variant="outline" className="ml-auto">
              {activities.length} recent
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Real-time monitoring of admin actions and role changes
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          {activities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No recent activity to display
            </div>
          ) : (
            <div className="space-y-4">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary/70 transition-colors animate-in fade-in slide-in-from-top-1 duration-300"
                >
                  <div className="mt-0.5">
                    {getActivityIcon(activity.action_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm leading-relaxed">
                      {formatActivityMessage(activity)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
