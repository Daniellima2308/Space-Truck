import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { TollRouteDiagnostic } from "@/lib/tollApi";
import { TomTomTollDiagnosticMap } from "@/components/TomTomTollDiagnosticMap";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

function getDiagnosticTitle(diagnostic: TollRouteDiagnostic): string {
  if (diagnostic.source === "no_route_path") return "Pedágios da rota";
  if (diagnostic.tollCount === 0) return "Nenhum pedágio encontrado";
  return `${diagnostic.tollCount} pedágio${diagnostic.tollCount === 1 ? "" : "s"} na rota`;
}

function getSourceLabel(source: TollRouteDiagnostic["source"]): string {
  if (source === "space_truck_toll_base") return "Base Space Truck";
  if (source === "no_route_path") return "Sem geometria da rota";
  if (source === "no_toll_points_found") return "Sem pontos encontrados";
  if (source === "insufficient_route_geometry") return "Geometria insuficiente";
  return source;
}

function findTollFieldContainer(): HTMLElement | null {
  const tollInput = Array.from(document.querySelectorAll<HTMLInputElement>("input"))
    .find((input) => input.placeholder === "Ex: R$ 350,00");

  return tollInput?.parentElement ?? null;
}

function InlineTollMapButton({ diagnostic, onOpen }: { diagnostic: TollRouteDiagnostic; onOpen: () => void }) {
  const details = diagnostic.source === "no_route_path"
    ? "diagnóstico"
    : `${diagnostic.tollCount} ponto${diagnostic.tollCount === 1 ? "" : "s"}`;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="absolute right-2 top-[1.85rem] z-10 flex h-9 items-center gap-1.5 rounded-xl border border-primary/40 bg-primary px-2.5 text-left text-primary-foreground shadow-lg transition active:scale-[0.98]"
      aria-label="Ver pedágio da rota no mapa"
    >
      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary-foreground/20 text-xs font-black">$</span>
      <span className="leading-none">
        <span className="block text-[9px] font-black uppercase tracking-[0.08em]">Ver pedágio</span>
        <span className="block text-[9px] font-bold opacity-90">{details}</span>
      </span>
    </button>
  );
}

export function TollDiagnosticFloatingPanel() {
  const [diagnostic, setDiagnostic] = useState<TollRouteDiagnostic | null>(null);
  const [open, setOpen] = useState(false);
  const [buttonContainer, setButtonContainer] = useState<HTMLElement | null>(null);
  const preparedInputRef = useRef<HTMLInputElement | null>(null);
  const originalPaddingRightRef = useRef<string>("");
  const originalPositionRef = useRef<string>("");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const current = window.__SPACE_TRUCK_LAST_TOLL_DIAGNOSTIC__;
    if (current) setDiagnostic(current);

    const handleDiagnostic = (event: Event) => {
      const detail = (event as CustomEvent<TollRouteDiagnostic>).detail;
      if (!detail) return;
      setDiagnostic(detail);
    };

    const handleOpen = () => setOpen(true);

    window.addEventListener("space-truck:toll-diagnostic", handleDiagnostic);
    window.addEventListener("space-truck:open-toll-diagnostic", handleOpen);
    return () => {
      window.removeEventListener("space-truck:toll-diagnostic", handleDiagnostic);
      window.removeEventListener("space-truck:open-toll-diagnostic", handleOpen);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !diagnostic) return;

    const prepareTarget = () => {
      const container = findTollFieldContainer();
      const input = container?.querySelector<HTMLInputElement>('input[placeholder="Ex: R$ 350,00"]') ?? null;

      setButtonContainer(container);
      if (!container || !input || preparedInputRef.current === input) return;

      if (preparedInputRef.current) {
        preparedInputRef.current.style.paddingRight = originalPaddingRightRef.current;
      }

      originalPaddingRightRef.current = input.style.paddingRight;
      originalPositionRef.current = container.style.position;
      container.style.position = "relative";
      input.style.paddingRight = "8.35rem";
      preparedInputRef.current = input;
    };

    prepareTarget();
    const observer = new MutationObserver(prepareTarget);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      if (preparedInputRef.current) preparedInputRef.current.style.paddingRight = originalPaddingRightRef.current;
      if (buttonContainer) buttonContainer.style.position = originalPositionRef.current;
    };
  }, [diagnostic, buttonContainer]);

  const title = useMemo(() => {
    return diagnostic ? getDiagnosticTitle(diagnostic) : "Pedágios da rota";
  }, [diagnostic]);

  if (!diagnostic) return null;

  return (
    <>
      {buttonContainer && createPortal(
        <InlineTollMapButton diagnostic={diagnostic} onOpen={() => setOpen(true)} />,
        buttonContainer,
      )}

      {open && (
        <div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-md" role="dialog" aria-modal="true">
          <div className="absolute inset-x-2 bottom-2 max-h-[92vh] overflow-hidden rounded-[2rem] border border-primary/20 bg-background shadow-2xl">
            <div className="sticky top-0 z-10 border-b border-border bg-background/95 p-4 backdrop-blur">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">Space Truck</p>
                  <h2 className="text-2xl font-black leading-tight text-foreground">{title}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {getSourceLabel(diagnostic.source)} • Corredor {diagnostic.routeCorridorKm} km
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-2xl border border-border bg-card px-4 py-3 text-sm font-black text-foreground shadow-sm"
                >
                  Fechar
                </button>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="rounded-2xl border border-border bg-card p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Total</p>
                  <p className="mt-1 text-sm font-black text-profit">{formatCurrency(diagnostic.total)}</p>
                </div>
                <div className="rounded-2xl border border-border bg-card p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Pontos</p>
                  <p className="mt-1 text-sm font-black text-foreground">{diagnostic.tollCount}</p>
                </div>
                <div className="rounded-2xl border border-border bg-card p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Precisão</p>
                  <p className="mt-1 text-sm font-black text-primary">{Math.round(diagnostic.routeCorridorKm * 1000)} m</p>
                </div>
              </div>
            </div>

            <div className="max-h-[72vh] overflow-y-auto p-4 pb-8">
              {diagnostic.reason && (
                <div className="mb-4 rounded-3xl border border-warning/30 bg-warning/10 p-4 text-sm text-foreground">
                  {diagnostic.reason}
                </div>
              )}

              <TomTomTollDiagnosticMap diagnostic={diagnostic} />

              {diagnostic.items.length === 0 ? (
                <div className="rounded-3xl border border-border bg-muted/20 p-5 text-sm text-muted-foreground">
                  Nenhuma praça foi listada neste diagnóstico. Se o campo de pedágio ficou como estimado, provavelmente a rota não entregou geometria suficiente para cruzar com a base interna.
                </div>
              ) : (
                <div className="space-y-3">
                  {diagnostic.items.map((item) => (
                    <button
                      key={`${item.id}-${item.order}`}
                      type="button"
                      className="w-full rounded-3xl border border-border bg-card p-4 text-left shadow-sm transition hover:border-primary/40 hover:bg-muted/20"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-primary">#{item.order} • {item.uf}</p>
                          <h3 className="mt-1 text-lg font-black leading-tight text-foreground">{item.name}</h3>
                          <p className="mt-2 text-xs font-semibold text-muted-foreground">
                            {item.road || "Rodovia não informada"}{item.km ? ` • KM ${item.km}` : ""}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {item.city || "Cidade não informada"} • {item.concessionaire || "Concessionária não informada"}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-lg font-black text-profit">{formatCurrency(item.value)}</p>
                          <p className="mt-1 rounded-full bg-primary/10 px-2 py-1 text-[11px] font-bold text-primary">{Math.round(item.distanceFromRouteKm * 1000)} m da rota</p>
                        </div>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                        <span className="rounded-2xl bg-muted/30 px-3 py-2">Após <strong className="text-foreground">{item.distanceAlongRouteKm} km</strong></span>
                        <span className="rounded-2xl bg-muted/30 px-3 py-2">Sentido: <strong className="text-foreground">{item.direction || "não informado"}</strong></span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
