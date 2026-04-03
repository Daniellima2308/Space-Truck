import { useNavigate } from "react-router-dom";
import { Calculator, Wrench, Wallet, Radio, FileText, Map, BarChart2, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { forwardRef } from "react";

/* Custom composed icon: truck front + driver avatar, integrated as one symbol */
const VehiclesIcon = forwardRef<SVGSVGElement, React.SVGProps<SVGSVGElement>>(
  (props, ref) => (
    <svg ref={ref} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <title>Veículos</title>
      {/* Truck body — front view */}
      <rect x="3" y="8" width="18" height="11" rx="2" />
      {/* Windshield */}
      <path d="M6 8V6.5A2 2 0 0 1 8 4.5h8a2 2 0 0 1 2 2V8" />
      {/* Bumper */}
      <line x1="5" y1="19" x2="19" y2="19" />
      {/* Headlights */}
      <rect x="4" y="14" width="2.5" height="2" rx="0.5" />
      <rect x="17.5" y="14" width="2.5" height="2" rx="0.5" />
      {/* Driver avatar — small circle head + arc body, centered */}
      <circle cx="12" cy="10.5" r="1.5" strokeWidth="1.5" />
      <path d="M9.5 15.5a2.5 2.5 0 0 1 5 0" strokeWidth="1.5" />
    </svg>
  ),
);
VehiclesIcon.displayName = "VehiclesIcon";

interface ToolItem {
  icon: LucideIcon | typeof VehiclesIcon;
  label: string;
  description: string;
  path: string;
  available: boolean;
}

interface ToolGroup {
  label: string;
  items: ToolItem[];
}

const TOOL_GROUPS: ToolGroup[] = [
  {
    label: "Operacional",
    items: [
      {
        icon: Calculator,
        label: "Análise de Frete",
        description: "Calcule se o frete vale a pena",
        path: "/freight-analysis",
        available: true,
      },
      {
        icon: VehiclesIcon,
        label: "Veículos",
        description: "Meus caminhões e configurações",
        path: "/vehicles",
        available: true,
      },
      {
        icon: Wrench,
        label: "Manutenção",
        description: "Histórico e alertas de manutenção",
        path: "/maintenance",
        available: true,
      },
    ],
  },
  {
    label: "Financeiro",
    items: [
      {
        icon: Wallet,
        label: "Gastos Pessoais",
        description: "Alimentação, banho e pernoite",
        path: "/personal-expenses",
        available: true,
      },
      {
        icon: BarChart2,
        label: "Relatórios",
        description: "Em breve",
        path: "",
        available: false,
      },
      {
        icon: FileText,
        label: "Documentos",
        description: "Em breve",
        path: "",
        available: false,
      },
    ],
  },
  {
    label: "Comunicação",
    items: [
      {
        icon: Radio,
        label: "PX Digital",
        description: "Comunidades do Trecho",
        path: "/px",
        available: true,
      },
      {
        icon: Map,
        label: "Pedágios",
        description: "Em breve",
        path: "",
        available: false,
      },
    ],
  },
];

const ToolsPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="px-4 pt-6 pb-4">
        <h1 className="text-2xl font-black tracking-tight">Ferramentas</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Módulos e recursos do app</p>
      </header>

      <div className="px-4 space-y-6">
        {TOOL_GROUPS.map((group) => (
          <section key={group.label}>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
              {group.label}
            </h2>
            <div className="space-y-2">
              {group.items.map((item) => (
                <button
                  key={item.label}
                  onClick={() => item.available && navigate(item.path)}
                  disabled={!item.available}
                  className={cn(
                    "w-full bg-card border border-border rounded-xl p-4 flex items-center gap-4 text-left transition-colors",
                    item.available
                      ? "hover:bg-accent/40 active:bg-accent/60"
                      : "opacity-50 cursor-default"
                  )}
                >
                  <div
                    className={cn(
                      "w-11 h-11 rounded-xl flex items-center justify-center shrink-0",
                      item.available ? "bg-primary/10" : "bg-muted"
                    )}
                  >
                    <item.icon
                      className={cn(
                        "w-5 h-5",
                        item.available ? "text-primary" : "text-muted-foreground"
                      )}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{item.label}</p>
                      {!item.available && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground uppercase tracking-wide">
                          Em breve
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                  </div>
                  {item.available && (
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};

export default ToolsPage;
