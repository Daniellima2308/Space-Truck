import { useNavigate, useParams } from "react-router-dom";
import {
  FontAwesomeIcon,
  iconArrowLeft,
  iconCheckCircle,
  iconChevronRight,
  iconHelpCircle,
  iconMessageCircle,
  iconSparkles,
} from "@/lib/icons";
import { helpTopics } from "@/features/help/helpTopics";

export default function HelpTopicDetailPage() {
  const navigate = useNavigate();
  const { topicId } = useParams<{ topicId: string }>();
  const topic = helpTopics.find((item) => item.id === topicId);
  const navigateToHelp = () => navigate("/help");

  if (!topic) {
    return (
      <div className="min-h-screen bg-background pb-24 px-4 pt-6">
        <BackToHelpButton onClick={navigateToHelp} />

        <section className="mt-6 rounded-3xl border border-border bg-card p-5 text-center">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-muted flex items-center justify-center">
            <FontAwesomeIcon icon={iconHelpCircle} className="w-5 h-5 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-black mt-4">Tópico não encontrado</h1>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            Esse conteúdo pode ter sido movido. Volte para a Central de Ajuda e escolha outro caminho.
          </p>
          <button
            type="button"
            onClick={navigateToHelp}
            className="mt-5 w-full rounded-xl bg-primary text-primary-foreground py-3 text-sm font-bold"
          >
            Abrir Central de Ajuda
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="px-4 pt-6 pb-3 space-y-4">
        <BackToHelpButton onClick={navigateToHelp} />

        <section className="rounded-3xl border border-border bg-card p-5 shadow-sm">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary mb-3">
            <FontAwesomeIcon icon={iconSparkles} className="w-3.5 h-3.5" />
            Ajuda rápida
          </div>
          <h1 className="text-2xl font-black tracking-tight">{topic.title}</h1>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{topic.description}</p>
        </section>
      </header>

      <main className="px-4 space-y-6">
        <section>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2 px-1">
            Passo a passo
          </h2>
          <div className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden">
            {topic.steps.map((step, index) => (
              <div key={`${topic.id}-step-${index}`} className="p-4 flex gap-3" data-testid="help-topic-step">
                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 text-xs font-black">
                  {index + 1}
                </div>
                <p className="text-sm leading-relaxed text-foreground/90">{step}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              <FontAwesomeIcon icon={iconCheckCircle} className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-sm">Isso resolveu?</h2>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Se ainda precisar de ajuda, o próximo passo será abrir atendimento com o contexto deste tópico.
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled
            className="w-full rounded-xl border border-border bg-muted/60 py-3 text-sm font-bold text-muted-foreground cursor-not-allowed"
          >
            Sim, resolveu
          </button>
          <button
            type="button"
            disabled
            className="w-full rounded-xl border border-dashed border-border py-3 text-sm font-bold text-muted-foreground cursor-not-allowed flex items-center justify-center gap-2"
          >
            <FontAwesomeIcon icon={iconMessageCircle} className="w-4 h-4" />
            Não resolveu, falar com suporte
            <FontAwesomeIcon icon={iconChevronRight} className="w-3 h-3" />
          </button>
        </section>
      </main>
    </div>
  );
}

function BackToHelpButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
    >
      <FontAwesomeIcon icon={iconArrowLeft} className="w-4 h-4" />
      Voltar para ajuda
    </button>
  );
}
