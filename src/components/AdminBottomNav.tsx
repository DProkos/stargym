import { LayoutDashboard, UsersRound, Calendar, Settings } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const items = [
  { label: "Dashboard", to: "/admin", icon: LayoutDashboard, exact: true },
  { label: "CRM", to: "/admin/crm", icon: UsersRound },
  { label: "Bookings", to: "/admin/bookings", icon: Calendar },
  { label: "Settings", to: "/admin/settings", icon: Settings },
];

export function AdminBottomNav() {
  const location = useLocation();

  const isActive = (to: string, exact?: boolean) =>
    exact ? location.pathname === to : location.pathname.startsWith(to);

  return (
    <>
      {/* Spacer to prevent fixed nav from covering content */}
      <div className="md:hidden h-16" aria-hidden="true" />
      <nav
        className={cn(
          "md:hidden fixed bottom-0 left-0 right-0 z-40",
          "bg-background/95 backdrop-blur-md border-t border-border",
          "pb-[env(safe-area-inset-bottom)]"
        )}
        aria-label="Admin quick navigation"
      >
        <ul className="grid grid-cols-4">
          {items.map((item) => {
            const active = isActive(item.to, item.exact);
            const Icon = item.icon;
            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={cn(
                    "flex flex-col items-center justify-center gap-0.5 py-2 px-1 text-[11px] font-medium transition-colors",
                    active
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5 transition-transform",
                      active && "scale-110"
                    )}
                  />
                  <span className="truncate max-w-full">{item.label}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
