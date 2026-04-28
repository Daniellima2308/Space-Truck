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
import { createSupportRequestPath, type SupportRequestFlowId } from "@/features/help/supportRequestOptions";

type HelpActionId = "quick-help" | "support" | "whatsapp" | "bug" | "suggestion";

type HelpAction = {
  id: HelpActionId;
  title: string;
  description: string;
  icon: typeof iconHelpCircle;
  tone: "primary" | "default" | "warning";
  statusLabel?: string;
  onClick?: () => void;
};

const helpActions: Omit<HelpAction, "onClick">[] = [
  {
    id: "quick-help",
    title: "Resolver problema rápido",
    description: "Veja respostas práticas antes de abrir atendimento.",
    icon: iconHelpCircle,
    tone: "primary",
  },
  {
    id: "support",
    title: "Falar com suporte",
    description: "Abra uma solicitação para nossa equipe analisar.",
    icon: iconMessageCircle,
    tone: "default",
  },
  {
    id: "whatsapp",
    title: "Atendimento pelo WhatsApp",
    description: "Peça para chamarmos você no WhatsApp.",
    icon: iconPhone,
    tone: "default",
  },
  {
    id: "bug",
    title: "Reportar problema",
    description: "Avise sobre erro, travamento ou algo errado no app.",
    icon: iconBug,
    tone: "warning",
  },
  {
    id: "suggestion",
    title: "Enviar sugestão",
    description: "Conte uma ideia para melhorar o Space Truck.",
    icon: iconLightbulb,
    tone: "warning",
  },
];

const requestFlowByActionId: Partial<Record<HelpActionId, SupportRequestFlowId>> = {
  support: "suporte",
  whatsapp: "whatsapp",
  bug: "problema",
  suggestion: "sugestao",
};

export default function HelpCenterPage() {
  const navigate = useNavigate();
  const featuredTopics = useMemo(() => helpTopics.slice(0, 5), []);
  const actions = useMemo<HelpAction[]>(
    () =>
      helpActions.map((action) => {
        if (action.id === "quick-help") {
          return {
            ...action,
            onClick: () => document.getElementById("quick-help")?.scrollIntoView({ behavior: "smooth" }),
          };
        }

        return {
          ...action,
          statusLabel: "Formulário",
          onClick: () => navigate(createSupportRequestPath(requestFlowByActionId[action.id] ?? "suporte")),
        };
      }),
    [navigate],
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="px-4 pt-6 pb-3 space-y-4">
        <button
          type="button"
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
              <HelpActionCard key={action.id} action={action} />
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
              <HelpTopicCard key={topic.id} topic={topic} onOpen={() => navigate(`/help/topico/${topic.id}`)} />
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
                Esta fase prepara o formulário de solicitação. O envio real com tickets, Supabase e anti-spam será ativado em uma PR separada.
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
      className="w-full rounded-2xl border border-border bg-card p-4 flex items-center gap-3 text-left transition-colors hover:bg-accent/40"
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
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
              {action.statusLabel}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{action.description}</p>
      </div>
      <FontAwesomeIcon icon={iconChevronRight} className="w-4 h-4 text-muted-foreground shrink-0" />
    </button>
  );
}

function HelpTopicCard({ topic, onOpen }: { topic: HelpTopic; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-2xl border border-border bg-card p-4 text-left hover:bg-accent/40 transition-colors"
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <FontAwesomeIcon icon={iconHelpCircle} className="w-4 h-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <h3 className="font-bold text-sm flex-1">{topic.title}</h3>
            <FontAwesomeIcon icon={iconChevronRight} className="w-3.5 h-3.5 text-muted-foreground mt-1 shrink-0" />
          </div>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{topic.description}</p>
          <ol className="mt-3 space-y-1.5 text-xs text-muted-foreground list-decimal list-inside">
            {topic.steps.slice(0, 2).map((step, index) => (
              <li key={`${topic.id}-${index}`}>{step}</li>
            ))}
          </ol>
        </div>
      </div>
    </button>
  );
}
