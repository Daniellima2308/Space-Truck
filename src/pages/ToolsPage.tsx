import { useNavigate } from "react-router-dom";
import { Calculator, Wrench, Wallet, Radio, ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { VeiculosIcon } from "@/components/icons/VeiculosIcon";

// --- Sub-components ---

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="px-1 pb-1 pt-3">
      <span className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground/70">
        {label}
      </span>
    </div>
  );
}

function ToolCard({
  icon: Icon,
  label,
  sublabel,
  onClick,
  accent,
}: {
  icon: LucideIcon | React.ComponentType<{ className?: string; size?: number }>;
  label: string;
  sublabel: string;
  onClick: () => void;
  accent?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-4 hover:bg-accent/60 active:bg-accent transition-colors"
    >
      <span
        className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${accent ?? "bg-secondary"}`}
      >
        <Icon className="w-5 h-5 text-foreground" size={20} />
      </span>
      <div className="flex-1 text-left min-w-0">
        <p className="text-sm font-semibold text-foreground leading-tight">{label}</p>
        <p className="text-[11px] text-muted-foreground leading-tight mt-0.5 truncate">{sublabel}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
    </button>
  );
}

function ToolsCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-2xl overflow-hidden divide-y divide-border/60">
      {children}
    </div>
  );
}

// --- Main Page ---

const ToolsPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <header className="px-4 pt-10 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Ferramentas</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Módulos e recursos do app</p>
      </header>

      <div className="px-4 space-y-1">
        {/* Operacional */}
        <SectionHeader label="Operacional" />
        <ToolsCard>
          <ToolCard
            icon={Calculator}
            label="Análise de Frete"
            sublabel="Calcule rentabilidade e resultado de cargas"
            onClick={() => navigate("/freight-analysis")}
            accent="bg-profit/10"
          />
          <ToolCard
            icon={VeiculosIcon as React.ComponentType<{ className?: string; size?: number }>}
            label="Meus Veículos"
            sublabel="Cadastre e gerencie seus caminhões"
            onClick={() => navigate("/vehicles")}
          />
          <ToolCard
            icon={Wrench}
            label="Manutenção"
            sublabel="Histórico e alertas de serviços"
            onClick={() => navigate("/maintenance")}
          />
        </ToolsCard>

        {/* Financeiro */}
        <SectionHeader label="Financeiro" />
        <ToolsCard>
          <ToolCard
            icon={Wallet}
            label="Gastos Pessoais"
            sublabel="Controle suas despesas pessoais"
            onClick={() => navigate("/personal-expenses")}
          />
        </ToolsCard>

        {/* Comunicação */}
        <SectionHeader label="Comunicação" />
        <ToolsCard>
          <ToolCard
            icon={Radio}
            label="PX Digital"
            sublabel="Canais de comunicação entre motoristas"
            onClick={() => navigate("/px")}
            accent="bg-px-orange/10"
          />
        </ToolsCard>

        {/* Coming soon placeholder */}
        <SectionHeader label="Em breve" />
        <div className="bg-card rounded-2xl px-4 py-4 space-y-3 opacity-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
              <span className="text-sm">📄</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Documentos</p>
              <p className="text-[11px] text-muted-foreground">Em desenvolvimento</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
              <span className="text-sm">🛣️</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Pedágios</p>
              <p className="text-[11px] text-muted-foreground">Em desenvolvimento</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ToolsPage;
