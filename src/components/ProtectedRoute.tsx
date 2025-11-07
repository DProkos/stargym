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
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setLoading(false);
        return;
      }

      setUser(session.user);

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id);

      if (roleData && roleData.length > 0) {
        const roles = roleData.map(r => r.role);
        
        if (allowedRoles) {
          // Check if user has at least one allowed role
          const hasAllowedRole = roles.some(role => allowedRoles.includes(role));
          if (hasAllowedRole) {
            // Find and set the first matching allowed role
            const matchingRole = roles.find(role => allowedRoles.includes(role));
            setUserRole(matchingRole || null);
          } else {
            // User has roles but none match - they should be redirected
            setUserRole('no_access');
          }
        } else {
          setUserRole(roles[0]);
        }
      } else {
        // User has no roles at all
        setUserRole('no_access');
      }
      
      setLoading(false);
    };

    checkAuth();
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
