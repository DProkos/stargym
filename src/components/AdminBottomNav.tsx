import { LayoutDashboard, UsersRound, Calendar, Settings } from "lucide-react";
import { PortalBottomNav } from "@/components/PortalBottomNav";

export function AdminBottomNav() {
  return (
    <PortalBottomNav
      ariaLabel="Admin quick navigation"
      items={[
        { label: "Dashboard", to: "/admin", icon: LayoutDashboard, exact: true },
        { label: "CRM", to: "/admin/crm", icon: UsersRound },
        { label: "Bookings", to: "/admin/bookings", icon: Calendar },
        { label: "Settings", to: "/admin/settings", icon: Settings },
      ]}
    />
  );
}
