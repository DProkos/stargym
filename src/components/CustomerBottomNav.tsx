import { Calendar, Bot, BookOpen, User } from "lucide-react";
import { PortalBottomNav } from "@/components/PortalBottomNav";

export function CustomerBottomNav() {
  return (
    <PortalBottomNav
      ariaLabel="Customer quick navigation"
      items={[
        { label: "Bookings", to: "/bookings", icon: Calendar, matchPaths: ["/customer", "/bookings"], exact: false },
        { label: "AI Coach", to: "/customer/ai-coach", icon: Bot },
        { label: "Programs", to: "/customer/saved-programs", icon: BookOpen },
        { label: "Profile", to: "/customer/profile", icon: User },
      ]}
    />
  );
}
