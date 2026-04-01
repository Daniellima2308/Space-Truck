import { useNavigate } from "react-router-dom";
import { Calculator, Wrench, Wallet, Radio, Truck, BarChart2, FileText, MapPin } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Tool {
  path: string;
  icon: LucideIcon;
  label: string;
  description: string;
  color: string;
  available: boolean;
}

const TOOLS: Tool[] = [
  {
    path: "/freight-analysis",
    icon: Calculator,
    label: "Calculadora de Frete",
    description: "Simule fretes e analise rentabilidade",
    color: "text-info bg-info/10",
    available: true,
  },
  {
    path: "/maintenance",
    icon: Wrench,
    label: "Manutenção",
    description: "Controle preventivo e histórico",
    color: "text-warning bg-warning/10",
    available: true,
  },
  {
    path: "/personal-expenses",
    icon: Wallet,
    label: "Gastos Pessoais",
    description: "Separação de despesas pessoais",
    color: "text-expense bg-expense/10",
    available: true,
  },
  {
    path: "/px",
    icon: Radio,
    label: "PX Digital",
    description: "Comunicação entre caminhoneiros",
    color: "text-px-orange bg-px-orange/10",
    available: true,
  },
  {
    path: "/vehicles",
    icon: Truck,
    label: "Minha Frota",
    description: "Gerenciamento de veículos",
    color: "text-primary bg-primary/10",
    available: true,
  },
  {
    path: "#",
    icon: BarChart2,
    label: "Relatórios",
    description: "Análises e exportações avançadas",
    color: "text-profit bg-profit/10",
    available: false,
  },
  {
    path: "#",
    icon: FileText,
    label: "Documentos",
    description: "CTe, manifesto e notas",
    color: "text-muted-foreground bg-muted",
    available: false,
  },
  {
    path: "#",
    icon: MapPin,
    label: "Pedágios",
    description: "Cálculo de rotas e pedágios",
    color: "text-muted-foreground bg-muted",
    available: false,
  },
];

function ToolCard({ tool, onClick }: { tool: Tool; onClick: () => void }) {
  const Icon = tool.icon;
  return (
    <button
      onClick={onClick}
      disabled={!tool.available}
      className={cn(
        "bg-card border border-border rounded-2xl p-4 flex flex-col gap-3 text-left transition-all",
        tool.available
          ? "hover:border-primary/40 hover:bg-card/80 active:scale-[0.98]"
          : "opacity-50 cursor-default"
      )}
    >
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", tool.color)}>
        <Icon className="w-5 h-5" strokeWidth={2} />
      </div>
      <div className="space-y-0.5">
        <p className="text-sm font-semibold leading-tight">{tool.label}</p>
        <p className="text-xs text-muted-foreground leading-snug">{tool.description}</p>
      </div>
      {!tool.available && (
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted px-2 py-0.5 rounded-full w-fit">
          Em breve
        </span>
      )}
    </button>
  );
}

export default function ToolsPage() {
  const navigate = useNavigate();

  const availableTools = TOOLS.filter((t) => t.available);
  const comingTools = TOOLS.filter((t) => !t.available);

  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="px-4 pt-10 pb-6">
        <h1 className="text-2xl font-bold">Ferramentas</h1>
        <p className="text-sm text-muted-foreground mt-1">Módulos e utilitários do app</p>
      </header>

      <div className="px-4 space-y-6">
        {/* Available tools */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
            Disponíveis
          </p>
          <div className="grid grid-cols-2 gap-3">
            {availableTools.map((tool) => (
              <ToolCard
                key={tool.path}
                tool={tool}
                onClick={() => navigate(tool.path)}
              />
            ))}
          </div>
        </div>

        {/* Coming soon tools */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
            Em Breve
          </p>
          <div className="grid grid-cols-2 gap-3">
            {comingTools.map((tool) => (
              <ToolCard key={tool.label} tool={tool} onClick={() => {}} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
