import { Calendar, Bot, BookOpen, User } from "lucide-react";
import { PortalBottomNav } from "@/components/PortalBottomNav";

export function CustomerBottomNav() {
  return (
    <PortalBottomNav
      ariaLabel="Customer quick navigation"
      items={[
        { label: "Bookings", to: "/bookings", icon: Calendar, exact: true },
        { label: "AI Coach", to: "/customer/ai-coach", icon: Bot, exact: true },
        { label: "Programs", to: "/customer/saved-programs", icon: BookOpen, exact: true },
        { label: "Profile", to: "/customer/profile", icon: User, exact: true },
      ]}
    />
  );
}
