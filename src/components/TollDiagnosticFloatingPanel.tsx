import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { TollRouteDiagnostic } from "@/lib/tollApi";
import {
  formatTollCurrency,
  getTollDiagnosticSourceLabel,
  getTollDiagnosticTitle,
} from "@/lib/tollDiagnosticView";
import { TomTomTollDiagnosticMap } from "@/components/TomTomTollDiagnosticMap";

function findTollFieldGrid(): HTMLElement | null {
  const explicitGrid = document.querySelector<HTMLElement>('[data-testid="toll-field-grid"]');
  if (explicitGrid) return explicitGrid;

  const explicitInput = document.querySelector<HTMLInputElement>('[data-testid="toll-field-input"]');
  const explicitInputGrid = explicitInput?.closest<HTMLElement>('[data-testid="toll-field-grid"]')
    ?? explicitInput?.parentElement?.parentElement
    ?? null;
  if (explicitInputGrid) return explicitInputGrid;

  const fallbackInput = Array.from(document.querySelectorAll<HTMLInputElement>("input"))
    .find((input) => input.placeholder === "Ex: R$ 350,00");

  return fallbackInput?.parentElement?.parentElement ?? null;
}

function InlineTollMapButton({
  diagnostic,
  onOpen,
}: {
  diagnostic: TollRouteDiagnostic;
  onOpen: (button: HTMLButtonElement) => void;
}) {
  const details = diagnostic.source === "no_route_path"
    ? "Diagnóstico da rota"
    : `${diagnostic.tollCount} ponto${diagnostic.tollCount === 1 ? "" : "s"}`;

  return (
    <button
      type="button"
      onClick={(event) => onOpen(event.currentTarget)}
      className="mt-[1.55rem] flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-primary/35 bg-primary px-3 text-primary-foreground shadow-lg transition active:scale-[0.98]"
      style={{ gridColumn: "2 / 3", gridRow: "2 / 3", alignSelf: "start" }}
      aria-label="Ver pedágio da rota no mapa"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-foreground/20 text-sm font-black">$</span>
      <span className="min-w-0 text-left leading-none">
        <span className="block text-[10px] font-black uppercase tracking-[0.1em]">Ver pedágio</span>
        <span className="mt-1 block truncate text-[10px] font-bold opacity-90">{details}</span>
      </span>
    </button>
  );
}

export function TollDiagnosticFloatingPanel() {
  const [diagnostic, setDiagnostic] = useState<TollRouteDiagnostic | null>(null);
  const [open, setOpen] = useState(false);
  const [buttonContainer, setButtonContainer] = useState<HTMLElement | null>(null);
  const [focusedTollId, setFocusedTollId] = useState<string | null>(null);
  const [focusRequestKey, setFocusRequestKey] = useState(0);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const openerButtonRef = useRef<HTMLButtonElement | null>(null);
  const wasOpenRef = useRef(false);
  const mapSectionRef = useRef<HTMLDivElement | null>(null);

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

    const updateTarget = () => setButtonContainer(findTollFieldGrid());

    updateTarget();
    const observer = new MutationObserver(updateTarget);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [diagnostic]);

  useEffect(() => {
    if (open) {
      wasOpenRef.current = true;
      window.setTimeout(() => closeButtonRef.current?.focus(), 0);
      return;
    }

    if (!wasOpenRef.current) return;
    wasOpenRef.current = false;
    window.setTimeout(() => openerButtonRef.current?.focus(), 0);
  }, [open]);

  const title = useMemo(() => {
    return diagnostic ? getTollDiagnosticTitle(diagnostic) : "Pedágios da rota";
  }, [diagnostic]);

  const closePanel = () => setOpen(false);

  const handleOpenPanel = (button: HTMLButtonElement) => {
    openerButtonRef.current = button;
    setOpen(true);
  };

  const handleTollCardClick = (tollId: string) => {
    setFocusedTollId(tollId);
    setFocusRequestKey((current) => current + 1);
    mapSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (!diagnostic) return null;

  return (
    <>
      {buttonContainer && createPortal(
        <InlineTollMapButton diagnostic={diagnostic} onOpen={handleOpenPanel} />,
        buttonContainer,
      )}

      {open && (
        <div
          className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="toll-diagnostic-title"
          onKeyDown={(event) => {
            if (event.key === "Escape") closePanel();
          }}
        >
          <div className="absolute inset-x-2 bottom-2 max-h-[92vh] overflow-hidden rounded-[2rem] border border-primary/20 bg-background shadow-2xl">
            <div className="sticky top-0 z-10 border-b border-border bg-background/95 p-4 backdrop-blur">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">Space Truck</p>
                  <h2 id="toll-diagnostic-title" className="text-2xl font-black leading-tight text-foreground">{title}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {getTollDiagnosticSourceLabel(diagnostic.source)} • Corredor {diagnostic.routeCorridorKm} km
                  </p>
                </div>
                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={closePanel}
                  className="rounded-2xl border border-border bg-card px-4 py-3 text-sm font-black text-foreground shadow-sm"
                >
                  Fechar
                </button>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="rounded-2xl border border-border bg-card p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Total</p>
                  <p className="mt-1 text-sm font-black text-profit">{formatTollCurrency(diagnostic.total)}</p>
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

              <div ref={mapSectionRef} className="scroll-mt-48">
                <TomTomTollDiagnosticMap
                  diagnostic={diagnostic}
                  focusedTollId={focusedTollId}
                  focusRequestKey={focusRequestKey}
                />
              </div>

              {diagnostic.items.length === 0 ? (
                <div className="rounded-3xl border border-border bg-muted/20 p-5 text-sm text-muted-foreground">
                  Nenhuma praça foi listada neste diagnóstico. Se o campo de pedágio ficou como estimado, provavelmente a rota não entregou geometria suficiente para cruzar com a base interna.
                </div>
              ) : (
                <div className="space-y-3">
                  {diagnostic.items.map((item) => {
                    const selected = item.id === focusedTollId;
                    return (
                      <button
                        key={`${item.id}-${item.order}`}
                        type="button"
                        onClick={() => handleTollCardClick(item.id)}
                        className={`w-full rounded-3xl border bg-card p-4 text-left shadow-sm transition active:scale-[0.99] ${
                          selected ? "border-primary/70 ring-2 ring-primary/20" : "border-border hover:border-primary/40 hover:bg-muted/20"
                        }`}
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
                            <p className="text-lg font-black text-profit">{formatTollCurrency(item.value)}</p>
                            <p className="mt-1 rounded-full bg-primary/10 px-2 py-1 text-[11px] font-bold text-primary">{Math.round(item.distanceFromRouteKm * 1000)} m da rota</p>
                          </div>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                          <span className="rounded-2xl bg-muted/30 px-3 py-2">Após <strong className="text-foreground">{item.distanceAlongRouteKm} km</strong></span>
                          <span className="rounded-2xl bg-muted/30 px-3 py-2">Toque para abrir no mapa</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
