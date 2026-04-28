import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  FontAwesomeIcon,
  iconArrowLeft,
  iconCheckCircle,
  iconChevronRight,
  iconHelpCircle,
  iconMessageCircle,
  iconPhone,
  iconSend,
  iconSparkles,
} from "@/lib/icons";
import {
  findSupportRequestFlow,
  supportRequestCategories,
  supportRequestChannels,
  type SupportRequestCategory,
  type SupportRequestChannel,
} from "@/features/help/supportRequestOptions";

const MIN_MESSAGE_LENGTH = 10;
const MAX_MESSAGE_LENGTH = 2000;

export default function SupportRequestPage() {
  const navigate = useNavigate();
  const { flowId } = useParams<{ flowId: string }>();
  const flow = useMemo(() => findSupportRequestFlow(flowId), [flowId]);
  const [category, setCategory] = useState<SupportRequestCategory>(flow.defaultCategory);
  const [channel, setChannel] = useState<SupportRequestChannel>(flow.defaultChannel);
  const [message, setMessage] = useState("");
  const [whatsApp, setWhatsApp] = useState("");
  const [allowsWhatsAppContact, setAllowsWhatsAppContact] = useState(flow.requiresWhatsApp);

  const needsWhatsApp = channel === "whatsapp" || flow.requiresWhatsApp;
  const trimmedMessage = message.trim();
  const messageLength = trimmedMessage.length;
  const canContinue =
    messageLength >= MIN_MESSAGE_LENGTH &&
    messageLength <= MAX_MESSAGE_LENGTH &&
    (!needsWhatsApp || (whatsApp.trim().length >= 10 && allowsWhatsAppContact));

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="px-4 pt-6 pb-3 space-y-4">
        <button
          type="button"
          onClick={() => navigate("/help")}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <FontAwesomeIcon icon={iconArrowLeft} className="w-4 h-4" />
          Voltar para ajuda
        </button>

        <section className="rounded-3xl border border-border bg-card p-5 shadow-sm">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary mb-3">
            <FontAwesomeIcon icon={iconSparkles} className="w-3.5 h-3.5" />
            {flow.badge}
          </div>
          <h1 className="text-2xl font-black tracking-tight">{flow.title}</h1>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{flow.description}</p>
        </section>
      </header>

      <main className="px-4 space-y-6">
        <section>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2 px-1">
            Assunto
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {supportRequestCategories.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setCategory(option.id)}
                className={cn(
                  "rounded-2xl border p-3 text-left text-xs font-bold transition-colors",
                  category === option.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:bg-accent/40",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2 px-1">
            Canal preferido
          </h2>
          <div className="space-y-2">
            {supportRequestChannels.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setChannel(option.id)}
                className={cn(
                  "w-full rounded-2xl border bg-card p-4 text-left transition-colors flex gap-3",
                  channel === option.id ? "border-primary bg-primary/10" : "border-border hover:bg-accent/40",
                )}
              >
                <div
                  className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                    channel === option.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                  )}
                >
                  <FontAwesomeIcon icon={option.id === "whatsapp" ? iconPhone : iconMessageCircle} className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">{option.label}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{option.description}</p>
                </div>
              </button>
            ))}
          </div>
        </section>

        {needsWhatsApp && (
          <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                <FontAwesomeIcon icon={iconPhone} className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h2 className="font-bold text-sm">Contato por WhatsApp</h2>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Informe o número com DDD para o suporte conseguir chamar você manualmente.
                </p>
              </div>
            </div>
            <input
              value={whatsApp}
              onChange={(event) => setWhatsApp(event.target.value)}
              placeholder="Ex: 51999999999"
              inputMode="tel"
              className="input-field w-full text-base py-3"
            />
            <label className="flex items-start gap-2 text-xs text-muted-foreground leading-relaxed">
              <input
                type="checkbox"
                checked={allowsWhatsAppContact}
                onChange={(event) => setAllowsWhatsAppContact(event.target.checked)}
                className="mt-0.5"
              />
              Autorizo o Space Truck a entrar em contato pelo WhatsApp sobre esta solicitação.
            </label>
          </section>
        )}

        <section>
          <div className="flex items-center justify-between mb-2 px-1">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              Mensagem
            </h2>
            <span className="text-xs text-muted-foreground">
              {messageLength}/{MAX_MESSAGE_LENGTH}
            </span>
          </div>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value.slice(0, MAX_MESSAGE_LENGTH))}
            placeholder={flow.messagePlaceholder}
            className="input-field w-full min-h-[150px] text-base leading-relaxed"
          />
          <p className="text-xs text-muted-foreground mt-2 px-1 leading-relaxed">
            Mínimo de {MIN_MESSAGE_LENGTH} caracteres. Evite enviar dados sensíveis como senha, documentos ou dados bancários.
          </p>
        </section>

        <section className="rounded-2xl border border-dashed border-border bg-muted/30 p-4">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              <FontAwesomeIcon icon={iconHelpCircle} className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Envio em breve</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Este formulário prepara a experiência. A criação real do ticket será ativada na próxima fase com Supabase, validação e anti-spam no servidor.
              </p>
            </div>
          </div>
        </section>

        <button
          type="button"
          disabled={!canContinue}
          className="w-full rounded-2xl bg-primary text-primary-foreground py-4 text-sm font-black disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <FontAwesomeIcon icon={canContinue ? iconSend : iconCheckCircle} className="w-4 h-4" />
          Preparar solicitação
          <FontAwesomeIcon icon={iconChevronRight} className="w-3.5 h-3.5" />
        </button>
      </main>
    </div>
  );
}
