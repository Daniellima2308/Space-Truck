import { useLocation, useNavigate } from "react-router-dom";
import { Home, Wrench, ClipboardList, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { OperacaoIcon } from "@/components/icons/OperacaoIcon";

type NavItem = {
  path: string;
  label: string;
  id: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number; size?: number }>;
  matchPrefix?: string;
};

const NAV_ITEMS: NavItem[] = [
  { path: "/", label: "Início", icon: Home, id: "nav-home" },
  { path: "/freight-analysis", label: "Operação", icon: OperacaoIcon, id: "nav-operacao" },
  { path: "/tools", label: "Ferramentas", icon: Wrench, id: "nav-tools" },
  { path: "/history", label: "Histórico", icon: ClipboardList, id: "nav-history" },
  { path: "/mais", label: "Mais", icon: MoreHorizontal, id: "nav-mais" },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const hiddenPaths = ["/login", "/register", "/forgot-password", "/reset-password", "/new-trip", "/trip/"];
  const shouldHide = hiddenPaths.some((p) => location.pathname.startsWith(p));
  if (shouldHide) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-[72px] max-w-lg mx-auto relative">
        {NAV_ITEMS.map((item) => {
          const isActive =
            location.pathname === item.path ||
            (item.matchPrefix && location.pathname.startsWith(item.matchPrefix));
          const Icon = item.icon;

          return (
            <button
              key={item.path}
              id={item.id}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center gap-1 px-2 py-2 rounded-lg transition-colors min-w-[50px]",
                isActive ? "text-profit" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon
                className={cn("w-5 h-5", isActive && "drop-shadow-[0_0_6px_hsl(142_60%_42%/0.45)]")}
                strokeWidth={isActive ? 2.5 : 2}
                size={20}
              />
              <span className={cn("text-[10px] font-semibold leading-tight", isActive && "text-profit")}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
