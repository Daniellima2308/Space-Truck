import { useLocation, useNavigate } from "react-router-dom";
import { Home, Wrench, History, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

function OperationIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Truck body — simplified side view */}
      <path d="M2 14h11V9H2a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1z" strokeWidth="0" fill="none" />
      <rect x="1" y="9" width="12" height="7" rx="1.5" />
      {/* Cab */}
      <path d="M13 9h3.5l3 3.5V16H13V9z" />
      {/* Wheels */}
      <circle cx="5.5" cy="17" r="1.75" />
      <circle cx="17" cy="17" r="1.75" />
      {/* Axle line */}
      <line x1="7.25" y1="16" x2="15.25" y2="16" />
      {/* Dollar badge — clean circle top-right */}
      <circle cx="19" cy="6" r="4.5" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="1.5" />
      {/* Dollar sign as path (not text for cross-browser consistency) */}
      <path d="M19 2.5v1m0 5v1m0-5.5c0.8 0.2 1.5 0.7 1.5 1.5s-0.7 1.3-1.5 1.5-1.5 0.7-1.5 1.5 0.7 1.3 1.5 1.5" strokeWidth="1.25" fill="none" stroke="currentColor" />
    </svg>
  );
}

const NAV_ITEMS = [
  { path: "/", label: "Início", icon: Home, id: "nav-home" },
  { path: "/operation", label: "Operação", icon: OperationIcon, id: "nav-operation" },
  { path: "/tools", label: "Ferramentas", icon: Wrench, id: "nav-tools" },
  { path: "/history", label: "Histórico", icon: History, id: "nav-history" },
  { path: "/more", label: "Mais", icon: MoreHorizontal, id: "nav-more" },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const hiddenPaths = ["/login", "/register", "/forgot-password", "/reset-password", "/new-trip", "/trip/"];
  const shouldHide = hiddenPaths.some((p) => location.pathname.startsWith(p));
  if (shouldHide) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-border safe-area-bottom"
      style={{ background: "hsl(var(--card) / 0.97)", backdropFilter: "blur(20px)" }}
    >
      <div className="flex items-stretch justify-around h-[64px] max-w-lg mx-auto">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.path === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(item.path);
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              id={item.id}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 px-1 py-2 transition-colors relative",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-primary" />
              )}
              <Icon
                className={cn(
                  "w-[22px] h-[22px]",
                  isActive && "drop-shadow-[0_0_6px_hsl(var(--primary)/0.45)]"
                )}
              />
              <span
                className={cn(
                  "text-[10px] font-semibold leading-tight",
                  isActive ? "text-primary" : ""
                )}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
