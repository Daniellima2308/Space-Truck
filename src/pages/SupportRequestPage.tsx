import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/components/ui/use-toast";
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
import { createSupportTicket } from "@/features/help/supportTicketService";
import {
  buildSupportTicketDraft,
  canSubmitSupportTicketRequest,
  getEffectiveSupportTicketChannel,
  getSupportTicketMessageLength,
  getSupportTicketSubmitErrorMessage,
  requiresWhatsAppContact,
} from "@/features/help/supportTicketRequest";
import {
  findSupportRequestFlow,
  supportRequestCategories,
  supportRequestChannels,
  type SupportRequestCategory,
  type SupportRequestChannel,
} from "@/features/help/supportRequestOptions";
import {
  SUPPORT_TICKET_MESSAGE_MAX_LENGTH,
  SUPPORT_TICKET_MESSAGE_MIN_LENGTH,
} from "@/features/help/supportTicketModel";

export default function SupportRequestPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { flowId } = useParams<{ flowId: string }>();
  const flow = useMemo(() => findSupportRequestFlow(flowId), [flowId]);
  const submitLockRef = useRef(false);
  const [category, setCategory] = useState<SupportRequestCategory>(flow.defaultCategory);
  const [channel, setChannel] = useState<SupportRequestChannel>(flow.defaultChannel);
  const [message, setMessage] = useState("");
  const [whatsApp, setWhatsApp] = useState("");
  const [allowsWhatsAppContact, setAllowsWhatsAppContact] = useState(flow.requiresWhatsApp);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdTicketNumber, setCreatedTicketNumber] = useState<string | null>(null);

  useEffect(() => {
    setCategory(flow.defaultCategory);
    setChannel(flow.defaultChannel);
    setAllowsWhatsAppContact(flow.requiresWhatsApp);
    setCreatedTicketNumber(null);
    submitLockRef.current = false;
  }, [flow]);

  const selectedCategoryLabel =
    supportRequestCategories.find((option) => option.id === category)?.label ?? "Outro assunto";
  const effectiveChannel = getEffectiveSupportTicketChannel(flow, channel);
  const needsWhatsApp = requiresWhatsAppContact(flow, channel);
  const messageLength = getSupportTicketMessageLength(message);
  const requestState = {
    userId: user?.id,
    userEmail: user?.email,
    flow,
    category,
    categoryLabel: selectedCategoryLabel,
    channel,
    message,
    whatsApp,
    allowsWhatsAppContact,
  };
  const canSubmit = canSubmitSupportTicketRequest(requestState);
  const canContinue = canSubmit && !isSubmitting;

  function clearCreatedTicket() {
    if (createdTicketNumber) setCreatedTicketNumber(null);
  }

  function startTicketSubmission() {
    submitLockRef.current = true;
    setCreatedTicketNumber(null);
    setIsSubmitting(true);
  }

  function finishTicketSubmission() {
    submitLockRef.current = false;
    setIsSubmitting(false);
  }

  function handleCategoryChange(nextCategory: SupportRequestCategory) {
    clearCreatedTicket();
    setCategory(nextCategory);
  }

  function handleChannelChange(nextChannel: SupportRequestChannel, isLockedByFlow: boolean) {
    if (isLockedByFlow) return;

    clearCreatedTicket();
    setChannel(nextChannel);
  }

  function handleWhatsAppChange(nextWhatsApp: string) {
    clearCreatedTicket();
    setWhatsApp(nextWhatsApp);
  }

  function handleWhatsAppConsentChange(nextAllowsContact: boolean) {
    clearCreatedTicket();
    setAllowsWhatsAppContact(nextAllowsContact);
  }

  function handleMessageChange(nextMessage: string) {
    clearCreatedTicket();
    setMessage(nextMessage.slice(0, SUPPORT_TICKET_MESSAGE_MAX_LENGTH));
  }

  async function handleSubmit() {
    if (submitLockRef.current || !user?.id || !canSubmitSupportTicketRequest(requestState)) return;

    const draft = buildSupportTicketDraft(requestState);

    startTicketSubmission();
    try {
      const ticket = await createSupportTicket({ ...draft, userId: user.id });
      setCreatedTicketNumber(ticket.ticket_number);
      setMessage("");
      setWhatsApp("");
      toast({
        title: "Solicitação enviada",
        description: `Ticket ${ticket.ticket_number} criado com sucesso.`,
      });
    } catch (error) {
      toast({
        title: "Não deu para enviar",
        description: getSupportTicketSubmitErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      finishTicketSubmission();
    }
  }

  function handleSubmitClick() {
    void handleSubmit();
  }

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
        {createdTicketNumber && (
          <section className="rounded-2xl border border-primary/30 bg-primary/10 p-4">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                <FontAwesomeIcon icon={iconCheckCircle} className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-bold text-sm">Solicitação enviada</h2>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Ticket {createdTicketNumber} criado. O histórico e as respostas serão evoluídos nas próximas fases.
                </p>
              </div>
            </div>
          </section>
        )}

        {!user?.id && (
          <section className="rounded-2xl border border-primary/30 bg-primary/10 p-4">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                <FontAwesomeIcon icon={iconHelpCircle} className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h2 className="font-bold text-sm">Entre na sua conta para enviar</h2>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Precisamos identificar sua conta para salvar e acompanhar a solicitação.
                </p>
              </div>
            </div>
          </section>
        )}

        <section>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2 px-1">
            Assunto
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {supportRequestCategories.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => { handleCategoryChange(option.id); }}
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
            {supportRequestChannels.map((option) => {
              const isLockedByFlow = flow.requiresWhatsApp && option.id !== "whatsapp";

              return (
                <button
                  key={option.id}
                  type="button"
                  disabled={isLockedByFlow}
                  onClick={() => { handleChannelChange(option.id, isLockedByFlow); }}
                  className={cn(
                    "w-full rounded-2xl border bg-card p-4 text-left transition-colors flex gap-3",
                    effectiveChannel === option.id ? "border-primary bg-primary/10" : "border-border hover:bg-accent/40",
                    isLockedByFlow && "opacity-50 cursor-not-allowed hover:bg-card",
                  )}
                >
                  <div
                    className={cn(
                      "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                      effectiveChannel === option.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                    )}
                  >
                    <FontAwesomeIcon icon={option.id === "whatsapp" ? iconPhone : iconMessageCircle} className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">{option.label}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{option.description}</p>
                  </div>
                </button>
              );
            })}
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
              onChange={(event) => { handleWhatsAppChange(event.target.value); }}
              placeholder="Ex: 51999999999"
              inputMode="tel"
              className="input-field w-full text-base py-3"
            />
            <label className="flex items-start gap-2 text-xs text-muted-foreground leading-relaxed">
              <input
                type="checkbox"
                checked={allowsWhatsAppContact}
                onChange={(event) => { handleWhatsAppConsentChange(event.target.checked); }}
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
              {messageLength}/{SUPPORT_TICKET_MESSAGE_MAX_LENGTH}
            </span>
          </div>
          <textarea
            value={message}
            onChange={(event) => { handleMessageChange(event.target.value); }}
            placeholder={flow.messagePlaceholder}
            className="input-field w-full min-h-[150px] text-base leading-relaxed"
          />
          <p className="text-xs text-muted-foreground mt-2 px-1 leading-relaxed">
            Mínimo de {SUPPORT_TICKET_MESSAGE_MIN_LENGTH} caracteres. Evite enviar dados sensíveis como senha, documentos ou dados bancários.
          </p>
        </section>

        <section className="rounded-2xl border border-dashed border-border bg-muted/30 p-4">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              <FontAwesomeIcon icon={iconHelpCircle} className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Como vamos usar isso</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                A solicitação será salva com segurança para atendimento. Chat, respostas e painel admin serão ativados em fases separadas.
              </p>
            </div>
          </div>
        </section>

        <button
          type="button"
          disabled={!canContinue}
          onClick={handleSubmitClick}
          className="w-full rounded-2xl bg-primary text-primary-foreground py-4 text-sm font-black disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <FontAwesomeIcon icon={iconSend} className="w-4 h-4" />
          {isSubmitting ? "Enviando..." : "Enviar solicitação"}
          <FontAwesomeIcon icon={iconChevronRight} className="w-3.5 h-3.5" />
        </button>
      </main>
    </div>
  );
}
