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
      {/* Truck body */}
      <rect x="1" y="9" width="13" height="9" rx="1" />
      {/* Cab */}
      <path d="M14 9l3 0 3 4v5h-6V9z" />
      {/* Wheels */}
      <circle cx="5" cy="18" r="2" />
      <circle cx="18" cy="18" r="2" />
      {/* Dollar sign integrated into truck body */}
      <path d="M7.5 12.5v-1m0 5v-1m0-3.5a1 1 0 0 1 1-1h.5a1 1 0 0 1 0 2h-1a1 1 0 0 0 0 2h.5a1 1 0 0 1 1 1" strokeWidth="1.25" />
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
                  isActive && "drop-shadow-[0_0_6px_hsl(142_65%_42%/0.45)]"
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
