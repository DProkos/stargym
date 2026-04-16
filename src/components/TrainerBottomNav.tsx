import { Calendar, ClipboardList, Users, User } from "lucide-react";
import { PortalBottomNav } from "@/components/PortalBottomNav";

export function TrainerBottomNav() {
  return (
    <PortalBottomNav
      ariaLabel="Trainer quick navigation"
      items={[
        { label: "Schedule", to: "/trainer/schedule", icon: Calendar },
        { label: "Classes", to: "/trainer/classes", icon: ClipboardList },
        { label: "Bookings", to: "/trainer/bookings", icon: Users },
        { label: "Profile", to: "/trainer/profile", icon: User },
      ]}
    />
  );
}
