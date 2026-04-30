import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/components/ui/use-toast";
import {
  FontAwesomeIcon,
  iconArrowLeft,
  iconChevronRight,
  iconClock3,
  iconHelpCircle,
  iconMessageCircle,
  iconRefreshCw,
  iconSparkles,
} from "@/lib/icons";
import { cn } from "@/lib/utils";
import { listSupportTickets, type SupportTicketListItem } from "@/features/help/supportTicketService";
import {
  formatSupportTicketDate,
  getSupportTicketStatusLabel,
  getSupportTicketStatusTone,
} from "@/features/help/supportTicketPresentation";

export default function SupportTicketsPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [tickets, setTickets] = useState<SupportTicketListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const latestRequestIdRef = useRef(0);

  const loadTickets = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      const requestId = ++latestRequestIdRef.current;

      if (authLoading) return;

      if (!user?.id) {
        setTickets([]);
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      if (mode === "refresh") setIsRefreshing(true);
      else setIsLoading(true);

      try {
        const result = await listSupportTickets(user.id);
        if (requestId !== latestRequestIdRef.current) return;
        setTickets(result);
      } catch (error) {
        if (requestId !== latestRequestIdRef.current) return;
        toast({
          title: "Não deu para carregar",
          description: error instanceof Error ? error.message : "Tente novamente em instantes.",
          variant: "destructive",
        });
      } finally {
        if (requestId !== latestRequestIdRef.current) return;
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [authLoading, toast, user?.id],
  );

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  function handleRefresh() {
    void loadTickets("refresh");
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

        <section className="rounded-3xl border border-border bg-card p-5 shadow-sm overflow-hidden relative">
          <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-primary/10" />
          <div className="relative space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
              <FontAwesomeIcon icon={iconSparkles} className="w-3.5 h-3.5" />
              Histórico de atendimento
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">Minhas solicitações</h1>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                Acompanhe os tickets que você já abriu no Space Truck.
              </p>
            </div>
          </div>
        </section>
      </header>

      <main className="px-4 space-y-5">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            Últimas solicitações
          </h2>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading || authLoading || !user?.id}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-bold text-muted-foreground disabled:opacity-50"
          >
            <FontAwesomeIcon icon={iconRefreshCw} className={cn("w-3 h-3", isRefreshing && "animate-spin")} />
            Atualizar
          </button>
        </div>

        {authLoading || isLoading ? (
          <section className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
            Carregando suas solicitações...
          </section>
        ) : tickets.length === 0 ? (
          <section className="rounded-2xl border border-dashed border-border bg-muted/30 p-5 text-center">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
              <FontAwesomeIcon icon={iconHelpCircle} className="w-5 h-5 text-primary" />
            </div>
            <h2 className="font-bold text-sm">Nenhum ticket ainda</h2>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Quando você abrir uma solicitação, ela vai aparecer aqui.
            </p>
          </section>
        ) : (
          <section className="space-y-3">
            {tickets.map((ticket) => (
              <TicketCard key={ticket.id} ticket={ticket} />
            ))}
          </section>
        )}
      </main>
    </div>
  );
}

function TicketCard({ ticket }: { ticket: SupportTicketListItem }) {
  const statusLabel = getSupportTicketStatusLabel(ticket.status);
  const statusTone = getSupportTicketStatusTone(ticket.status);

  return (
    <article className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
          <FontAwesomeIcon icon={iconMessageCircle} className="w-4 h-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-black text-primary">{ticket.ticket_number}</span>
            <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold", statusTone)}>
              {statusLabel}
            </span>
          </div>
          <h3 className="font-bold text-sm mt-1 line-clamp-2">{ticket.title}</h3>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">{ticket.message}</p>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-3">
            <FontAwesomeIcon icon={iconClock3} className="w-3 h-3" />
            {formatSupportTicketDate(ticket.created_at)}
          </div>
        </div>
        <FontAwesomeIcon icon={iconChevronRight} className="w-3.5 h-3.5 text-muted-foreground mt-1 shrink-0" />
      </div>
    </article>
  );
}
