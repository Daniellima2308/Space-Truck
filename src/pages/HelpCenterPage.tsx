import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  FontAwesomeIcon,
  iconArrowLeft,
  iconBug,
  iconChevronRight,
  iconHelpCircle,
  iconLightbulb,
  iconMessageCircle,
  iconPhone,
  iconSearch,
  iconSparkles,
} from "@/lib/icons";
import { helpTopics, type HelpTopic } from "@/features/help/helpTopics";

type HelpAction = {
  title: string;
  description: string;
  icon: typeof iconHelpCircle;
  tone: "primary" | "default" | "warning";
  statusLabel?: string;
  disabled?: boolean;
  onClick?: () => void;
};

const helpActions: Omit<HelpAction, "onClick">[] = [
  {
    title: "Resolver problema rápido",
    description: "Veja respostas práticas antes de abrir atendimento.",
    icon: iconHelpCircle,
    tone: "primary",
  },
  {
    title: "Falar com suporte",
    description: "Abra uma solicitação para nossa equipe analisar.",
    icon: iconMessageCircle,
    tone: "default",
    statusLabel: "Em breve",
    disabled: true,
  },
  {
    title: "Atendimento pelo WhatsApp",
    description: "Peça para chamarmos você no WhatsApp.",
    icon: iconPhone,
    tone: "default",
    statusLabel: "Em breve",
    disabled: true,
  },
  {
    title: "Reportar problema",
    description: "Avise sobre erro, travamento ou algo errado no app.",
    icon: iconBug,
    tone: "warning",
    statusLabel: "Em breve",
    disabled: true,
  },
  {
    title: "Enviar sugestão",
    description: "Conte uma ideia para melhorar o Space Truck.",
    icon: iconLightbulb,
    tone: "warning",
    statusLabel: "Em breve",
    disabled: true,
  },
];

export default function HelpCenterPage() {
  const navigate = useNavigate();
  const featuredTopics = useMemo(() => helpTopics.slice(0, 5), []);
  const actions = useMemo<HelpAction[]>(
    () =>
      helpActions.map((action) =>
        action.title === "Resolver problema rápido"
          ? {
              ...action,
              onClick: () => document.getElementById("quick-help")?.scrollIntoView({ behavior: "smooth" }),
            }
          : action,
      ),
    [],
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="px-4 pt-6 pb-3 space-y-4">
        <button
          onClick={() => navigate("/more")}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <FontAwesomeIcon icon={iconArrowLeft} className="w-4 h-4" />
          Voltar
        </button>

        <section className="rounded-3xl border border-border bg-card p-5 shadow-sm overflow-hidden relative">
          <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-primary/10" />
          <div className="relative space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
              <FontAwesomeIcon icon={iconSparkles} className="w-3.5 h-3.5" />
              Ajuda com Bino
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">Como podemos te ajudar?</h1>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                Resolva dúvidas rápidas ou escolha o melhor caminho para falar com o suporte Space Truck.
              </p>
            </div>
          </div>
        </section>
      </header>

      <main className="px-4 space-y-6">
        <section>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2 px-1">
            Caminhos de atendimento
          </h2>
          <div className="grid grid-cols-1 gap-3">
            {actions.map((action) => (
              <HelpActionCard key={action.title} action={action} />
            ))}
          </div>
        </section>

        <section id="quick-help">
          <div className="flex items-center justify-between mb-2 px-1">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              Ajuda rápida
            </h2>
            <span className="text-xs text-muted-foreground">{featuredTopics.length} tópicos</span>
          </div>
          <div className="space-y-2">
            {featuredTopics.map((topic) => (
              <HelpTopicCard key={topic.id} topic={topic} />
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-dashed border-border bg-muted/30 p-4">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              <FontAwesomeIcon icon={iconSearch} className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Próximas etapas</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Esta é a base visual da Central de Ajuda. Tickets, chat, WhatsApp e painel admin serão ativados em fases separadas.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function HelpActionCard({ action }: { action: HelpAction }) {
  return (
    <button
      type="button"
      onClick={action.onClick}
      disabled={action.disabled}
      className={cn(
        "w-full rounded-2xl border border-border bg-card p-4 flex items-center gap-3 text-left transition-colors",
        action.disabled ? "opacity-70 cursor-not-allowed" : "hover:bg-accent/40",
      )}
    >
      <div
        className={cn(
          "w-11 h-11 rounded-2xl flex items-center justify-center shrink-0",
          action.tone === "primary" && "bg-primary/10 text-primary",
          action.tone === "warning" && "bg-warning/15 text-warning-foreground",
          action.tone === "default" && "bg-muted text-muted-foreground",
        )}
      >
        <FontAwesomeIcon icon={action.icon} className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-sm font-bold">{action.title}</h3>
          {action.statusLabel && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
              {action.statusLabel}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{action.description}</p>
      </div>
      {!action.disabled && <FontAwesomeIcon icon={iconChevronRight} className="w-4 h-4 text-muted-foreground shrink-0" />}
    </button>
  );
}

function HelpTopicCard({ topic }: { topic: HelpTopic }) {
  return (
    <article className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <FontAwesomeIcon icon={iconHelpCircle} className="w-4 h-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-sm">{topic.title}</h3>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{topic.description}</p>
          <ol className="mt-3 space-y-1.5 text-xs text-muted-foreground list-decimal list-inside">
            {topic.steps.slice(0, 2).map((step, index) => (
              <li key={`${topic.id}-${index}`}>{step}</li>
            ))}
          </ol>
        </div>
      </div>
    </article>
  );
}
