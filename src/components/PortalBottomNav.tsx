import { NavLink, useLocation } from "react-router-dom";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BottomNavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  exact?: boolean;
  matchPaths?: string[];
}

interface PortalBottomNavProps {
  items: BottomNavItem[];
  ariaLabel?: string;
}

export function PortalBottomNav({ items, ariaLabel = "Portal navigation" }: PortalBottomNavProps) {
  const location = useLocation();

  const isActive = (item: BottomNavItem) => {
    if (item.matchPaths?.some((p) => location.pathname.startsWith(p))) return true;
    return item.exact ? location.pathname === item.to : location.pathname.startsWith(item.to);
  };

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
        aria-label={ariaLabel}
      >
        <ul
          className="grid"
          style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
        >
          {items.map((item) => {
            const active = isActive(item);
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
