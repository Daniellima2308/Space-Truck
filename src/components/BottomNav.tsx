import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { appPath } from "@/lib/routes";
import type { IconDefinition } from "@/lib/icons";
import { FontAwesomeIcon, iconHome, iconOperacao, iconWrench, iconHistory, iconMoreHorizontal } from "@/lib/icons";

const NAV_ITEMS: { path: string; label: string; icon: IconDefinition; id: string }[] = [
  { path: appPath(), label: "Início", icon: iconHome, id: "nav-home" },
  { path: appPath("/operation"), label: "Operação", icon: iconOperacao, id: "nav-operation" },
  { path: appPath("/tools"), label: "Ferramentas", icon: iconWrench, id: "nav-tools" },
  { path: appPath("/history"), label: "Histórico", icon: iconHistory, id: "nav-history" },
  { path: appPath("/more"), label: "Mais", icon: iconMoreHorizontal, id: "nav-more" },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const hiddenPaths = [appPath("/new-trip"), appPath("/trip/")];
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
            item.path === appPath()
              ? location.pathname === appPath()
              : location.pathname.startsWith(item.path);
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
              <FontAwesomeIcon
                icon={item.icon}
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
