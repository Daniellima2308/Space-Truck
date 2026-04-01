import { useLocation, useNavigate } from "react-router-dom";
import { Home, Wrench, History, MoreHorizontal, Truck } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { path: "/", label: "Início", icon: Home, id: "nav-home" },
  { path: "/trip/ativa", label: "Operação", icon: Truck, id: "nav-operation" },
  { path: "/ferramentas", label: "Ferramentas", icon: Wrench, id: "nav-tools" },
  { path: "/history", label: "Histórico", icon: History, id: "nav-history" },
  { path: "/mais", label: "Mais", icon: MoreHorizontal, id: "nav-more" },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const hiddenPaths = ["/login", "/register", "/forgot-password", "/reset-password", "/new-trip", "/trip/"];
  const shouldHide = hiddenPaths.some((p) => location.pathname.startsWith(p));
  if (shouldHide) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-[68px] max-w-lg mx-auto">
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
                "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all min-w-[56px]",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon
                className={cn(
                  "w-5 h-5 transition-all",
                  isActive && "drop-shadow-[0_0_6px_hsl(var(--primary)/0.5)]"
                )}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span className="text-[10px] font-semibold leading-tight">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
