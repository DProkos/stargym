import { User, LogOut, Home, Users, Bot, BookOpen } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { CustomerBottomNav } from "@/components/CustomerBottomNav";
import { useState, useEffect } from "react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

export function AppSidebarCustomer() {
  const { state } = useSidebar();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
      }
    };
    getUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const items = [
    { title: t('nav.home'), url: "/", icon: Home },
    { title: language === 'el' ? 'Μαθήματα' : 'Browse Classes', url: "/customer/bookings", icon: Users },
    { title: language === 'el' ? 'AI Προπονητής' : 'AI Coach', url: "/customer/ai-coach", icon: Bot },
    { title: language === 'el' ? 'Προγράμματα' : 'Programs', url: "/customer/saved-programs", icon: BookOpen },
    { title: t('nav.profile'), url: "/customer/profile", icon: User },
  ];

  return (
    <>
    <Sidebar collapsible="icon">
      <SidebarContent>
        {userId && state === "expanded" && (
          <div className="p-4 border-b border-border">
            <RoleSwitcher userId={userId} variant="outline" size="sm" />
          </div>
        )}
        <SidebarGroup>
          <SidebarGroupLabel>{t('nav.customer')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      end 
                      className="hover:bg-muted/50" 
                      activeClassName="bg-muted text-primary font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      {state === "expanded" && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              <SidebarMenuItem>
                <SidebarMenuButton onClick={handleLogout}>
                  <LogOut className="h-4 w-4" />
                  {state === "expanded" && <span>{t('nav.logout')}</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
    <CustomerBottomNav />
    </>
  );
}
