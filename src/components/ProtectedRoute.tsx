import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          setLoading(false);
          return;
        }

        setUser(session.user);

        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id);

        if (roleError) {
          console.error('Error fetching user roles:', roleError);
          setUserRole('no_access');
          setLoading(false);
          return;
        }

        if (roleData && roleData.length > 0) {
          const roles = roleData.map(r => r.role);
          
          if (allowedRoles) {
            const hasAllowedRole = roles.some(role => allowedRoles.includes(role));
            if (hasAllowedRole) {
              const matchingRole = roles.find(role => allowedRoles.includes(role));
              setUserRole(matchingRole || null);
            } else {
              setUserRole('no_access');
            }
          } else {
            setUserRole(roles[0]);
          }
        } else {
          setUserRole('no_access');
        }
      } catch (error) {
        console.error('Auth check error:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setUser(null);
        setUserRole(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [allowedRoles]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // If specific roles are required and user doesn't have any of them, redirect
  if (allowedRoles && (!userRole || userRole === 'no_access')) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
