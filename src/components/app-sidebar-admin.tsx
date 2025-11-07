import { LayoutDashboard, Users, Calendar, DollarSign, Settings, LogOut, Home, Edit, UserCog, BookText, Mail } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

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

export function AppSidebarAdmin() {
  const { state } = useSidebar();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const items = [
    { title: t('nav.home'), url: "/", icon: Home },
    { title: t('admin.dashboard'), url: "/admin", icon: LayoutDashboard },
    { title: t('admin.members'), url: "/admin/members", icon: Users },
    { title: t('admin.bookings'), url: "/admin/bookings", icon: Calendar },
    { title: t('admin.trainers'), url: "/admin/trainers", icon: UserCog },
    { title: t('admin.classes'), url: "/admin/classes", icon: BookText },
    { title: 'Content Editor', url: "/admin/content", icon: Edit },
    { title: 'Email Templates', url: "/admin/email-templates", icon: Mail },
    { title: 'Settings', url: "/admin/settings", icon: Settings },
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t('nav.admin')}</SidebarGroupLabel>
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
  );
}
