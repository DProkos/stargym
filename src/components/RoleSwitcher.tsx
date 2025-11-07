import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { User2, Shield, Dumbbell, Users } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

interface RoleSwitcherProps {
  userId: string;
  variant?: 'default' | 'ghost' | 'outline' | 'secondary';
  size?: 'default' | 'sm' | 'lg';
}

type Role = 'admin' | 'trainer' | 'member';

export function RoleSwitcher({ userId, variant = 'secondary', size = 'default' }: RoleSwitcherProps) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [currentRole, setCurrentRole] = useState<Role | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRoles = async () => {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (data) {
        const userRoles = data.map((r) => r.role as Role);
        setRoles(userRoles);
        
        // Determine current role based on URL
        const path = window.location.pathname;
        if (path.startsWith('/admin')) {
          setCurrentRole('admin');
        } else if (path.startsWith('/trainer')) {
          setCurrentRole('trainer');
        } else if (path.startsWith('/customer')) {
          setCurrentRole('member');
        } else {
          // Default to highest privilege role
          if (userRoles.includes('admin')) setCurrentRole('admin');
          else if (userRoles.includes('trainer')) setCurrentRole('trainer');
          else if (userRoles.includes('member')) setCurrentRole('member');
        }
      }
    };

    fetchRoles();
  }, [userId]);

  if (roles.length <= 1) {
    return null; // Don't show switcher if user has only one role
  }

  const getRoleIcon = (role: Role) => {
    switch (role) {
      case 'admin':
        return Shield;
      case 'trainer':
        return Dumbbell;
      case 'member':
        return User2;
    }
  };

  const getRoleLabel = (role: Role) => {
    switch (role) {
      case 'admin':
        return 'Admin Panel';
      case 'trainer':
        return 'Trainer Portal';
      case 'member':
        return 'Member Portal';
    }
  };

  const getRolePath = (role: Role) => {
    switch (role) {
      case 'admin':
        return '/admin';
      case 'trainer':
        return '/trainer/schedule';
      case 'member':
        return '/customer/bookings';
    }
  };

  const handleRoleSwitch = (role: Role) => {
    setCurrentRole(role);
    navigate(getRolePath(role));
  };

  const CurrentIcon = currentRole ? getRoleIcon(currentRole) : Users;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className="gap-2">
          <CurrentIcon className="h-4 w-4" />
          <span>{currentRole ? getRoleLabel(currentRole) : 'Switch Role'}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 bg-card border-border z-50">
        <DropdownMenuLabel>Switch Portal</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {roles.map((role) => {
          const Icon = getRoleIcon(role);
          const isActive = role === currentRole;
          
          return (
            <DropdownMenuItem
              key={role}
              onClick={() => handleRoleSwitch(role)}
              className={isActive ? 'bg-muted text-primary font-medium' : ''}
            >
              <Icon className="h-4 w-4 mr-2" />
              {getRoleLabel(role)}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
