import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { TollRouteDiagnostic } from "@/lib/tollApi";
import {
  formatTollCurrency,
  getTollDiagnosticSourceLabel,
  getTollDiagnosticTitle,
} from "@/lib/tollDiagnosticView";
import { TomTomTollDiagnosticMap } from "@/components/TomTomTollDiagnosticMap";

type TollIssueReportType =
  | "missing_toll"
  | "wrong_value"
  | "wrong_name"
  | "duplicate_toll"
  | "wrong_route"
  | "other";

const TOLL_DEBUG_STORAGE_KEY = "spaceTruck.debugTolls";
const TOLL_REPORT_STORAGE_KEY = "spaceTruck.tollIssueReports";

const TOLL_ISSUE_REPORT_OPTIONS: Array<{ value: TollIssueReportType; label: string }> = [
  { value: "missing_toll", label: "Faltou uma praça/pórtico" },
  { value: "wrong_value", label: "Valor errado" },
  { value: "wrong_name", label: "Nome ou praça errada" },
  { value: "duplicate_toll", label: "Cobrou pedágio duplicado" },
  { value: "wrong_route", label: "Apareceu na rota errada" },
  { value: "other", label: "Outro problema" },
];

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

function getNearMissReasonLabel(reason: string): string {
  switch (reason) {
    case "outside_route_corridor":
      return "Fora do corredor";
    case "route_road_mismatch":
      return "Rodovia diferente";
    case "bearing_mismatch":
      return "Direção física incompatível";
    case "direction_mismatch":
      return "Sentido incompatível";
    default:
      return "Não cobrado";
  }
}

function isInternalTollDebugEnabled(): boolean {
  if (import.meta.env.DEV) return true;
  if (typeof window === "undefined") return false;

  const params = new URLSearchParams(window.location.search);
  const debugParam = params.get("debugTolls");

  if (debugParam === "1" || debugParam === "true") {
    window.localStorage.setItem(TOLL_DEBUG_STORAGE_KEY, "true");
    return true;
  }

  if (debugParam === "0" || debugParam === "false") {
    window.localStorage.removeItem(TOLL_DEBUG_STORAGE_KEY);
    return false;
  }

  return window.localStorage.getItem(TOLL_DEBUG_STORAGE_KEY) === "true";
}

function saveTollIssueReport(report: unknown): void {
  if (typeof window === "undefined") return;

  const currentReports = (() => {
    try {
      const raw = window.localStorage.getItem(TOLL_REPORT_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  })();

  window.localStorage.setItem(
    TOLL_REPORT_STORAGE_KEY,
    JSON.stringify([report, ...currentReports].slice(0, 25)),
  );
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
  const [reportOpen, setReportOpen] = useState(false);
  const [reportType, setReportType] = useState<TollIssueReportType>("wrong_value");
  const [selectedReportTollId, setSelectedReportTollId] = useState("");
  const [reportMessage, setReportMessage] = useState("");
  const [reportSent, setReportSent] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const openerButtonRef = useRef<HTMLButtonElement | null>(null);
  const wasOpenRef = useRef(false);
  const mapSectionRef = useRef<HTMLDivElement | null>(null);
  const showInternalTollDiagnostics = useMemo(isInternalTollDebugEnabled, []);

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
    setReportOpen(false);
    setReportSent(false);
    setReportMessage("");
    setSelectedReportTollId("");
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

  const handleSubmitReport = () => {
    if (!diagnostic) return;

    const report = {
      id: `toll-report-${Date.now()}`,
      type: reportType,
      selectedTollId: selectedReportTollId || null,
      userMessage: reportMessage.trim() || null,
      createdAt: new Date().toISOString(),
      diagnosticSnapshot: diagnostic,
    };

    saveTollIssueReport(report);

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("space-truck:toll-issue-report", { detail: report }));
      if (showInternalTollDiagnostics) {
        console.info("[Space Truck] Relatório de erro de pedágio salvo", report);
      }
    }

    setReportSent(true);
    setReportOpen(false);
    setReportMessage("");
    setSelectedReportTollId("");
  };

  if (!diagnostic) return null;

  const nearMissItems = diagnostic.nearMissItems ?? [];
  const reportableTollItems = diagnostic.items;

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

              <section className="mt-6 rounded-[1.75rem] border border-border bg-card p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">Ajude a melhorar</p>
                    <h3 className="mt-1 text-lg font-black text-foreground">Encontrou erro no pedágio?</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Avise se faltou praça, se o valor parece errado ou se apareceu cobrança duplicada.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setReportOpen((current) => !current);
                      setReportSent(false);
                    }}
                    className="shrink-0 rounded-2xl border border-primary/35 bg-primary/10 px-3 py-2 text-xs font-black text-primary transition active:scale-[0.98]"
                  >
                    Reportar
                  </button>
                </div>

                {reportSent && (
                  <div className="mt-4 rounded-2xl border border-profit/30 bg-profit/10 p-3 text-xs font-semibold text-foreground">
                    Obrigado! O relatório ficou salvo para análise da base de pedágios.
                  </div>
                )}

                {reportOpen && (
                  <div className="mt-4 space-y-3">
                    <label className="block text-xs font-bold text-foreground">
                      Tipo do problema
                      <select
                        value={reportType}
                        onChange={(event) => setReportType(event.currentTarget.value as TollIssueReportType)}
                        className="mt-2 h-12 w-full rounded-2xl border border-border bg-background px-3 text-sm font-semibold text-foreground"
                      >
                        {TOLL_ISSUE_REPORT_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </label>

                    <label className="block text-xs font-bold text-foreground">
                      Praça relacionada
                      <select
                        value={selectedReportTollId}
                        onChange={(event) => setSelectedReportTollId(event.currentTarget.value)}
                        className="mt-2 h-12 w-full rounded-2xl border border-border bg-background px-3 text-sm font-semibold text-foreground"
                      >
                        <option value="">Uma praça que não apareceu / não sei informar</option>
                        {reportableTollItems.map((item) => (
                          <option key={`${item.id}-${item.order}`} value={item.id}>
                            {item.name} • {formatTollCurrency(item.value)}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block text-xs font-bold text-foreground">
                      Observação opcional
                      <textarea
                        value={reportMessage}
                        onChange={(event) => setReportMessage(event.currentTarget.value)}
                        rows={3}
                        placeholder="Ex: valor diferente da praça, duplicou cobrança, faltou pedágio..."
                        className="mt-2 w-full rounded-2xl border border-border bg-background px-3 py-3 text-sm font-semibold text-foreground placeholder:text-muted-foreground"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={handleSubmitReport}
                      className="h-12 w-full rounded-2xl bg-primary px-4 text-sm font-black text-primary-foreground shadow-sm transition active:scale-[0.98]"
                    >
                      Enviar relatório
                    </button>
                  </div>
                )}
              </section>

              {showInternalTollDiagnostics && nearMissItems.length > 0 && (
                <section className="mt-6 rounded-[1.75rem] border border-warning/30 bg-warning/5 p-4">
                  <div className="mb-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-warning">Diagnóstico interno</p>
                    <h3 className="mt-1 text-lg font-black text-foreground">Pedágios próximos não cobrados</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Visível apenas em modo interno. Ative com ?debugTolls=1 ou localStorage {TOLL_DEBUG_STORAGE_KEY}=true.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {nearMissItems.slice(0, 20).map((item) => (
                      <div key={`${item.id}-${item.reason}`} className="rounded-3xl border border-warning/20 bg-card p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-warning">
                              {getNearMissReasonLabel(item.reason)} • {item.uf}
                            </p>
                            <h4 className="mt-1 text-base font-black leading-tight text-foreground">{item.name}</h4>
                            <p className="mt-2 text-xs font-semibold text-muted-foreground">
                              {item.road || "Rodovia não informada"}{item.km ? ` • KM ${item.km}` : ""}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {item.city || "Cidade não informada"} • {item.concessionaire || "Concessionária não informada"}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="rounded-full bg-warning/10 px-2 py-1 text-[11px] font-black text-warning">
                              {Math.round(item.distanceFromRouteKm * 1000)} m
                            </p>
                            <p className="mt-2 text-[10px] font-bold text-muted-foreground">
                              limite {Math.round(item.routeCorridorKm * 1000)} m
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-1 gap-2 text-[11px] text-muted-foreground">
                          <span className="rounded-2xl bg-muted/30 px-3 py-2">
                            Rodovia da rota: <strong className="text-foreground">{item.matchedRouteRoads.join(", ") || "não informada"}</strong>
                          </span>
                          <span className="rounded-2xl bg-muted/30 px-3 py-2">
                            Sentido inferido: <strong className="text-foreground">{item.inferredRoadDirection}</strong>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
