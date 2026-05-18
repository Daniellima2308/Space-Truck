import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { TollRouteDiagnostic } from "@/lib/tollApi";
import {
  formatTollCurrency,
  getTollDiagnosticSourceLabel,
  getTollDiagnosticTitle,
} from "@/lib/tollDiagnosticView";
import { TomTomTollDiagnosticMap } from "@/components/TomTomTollDiagnosticMap";
import { useAuth } from "@/context/auth-context";
import { APPROVED_ACCESS_STATUS } from "@/features/access/accessTypes";
import { useAccessProfile } from "@/features/access/useAccessProfile";

const DEBUG_TOLLS_STORAGE_KEY = "spaceTruck.debugTolls";
const DEBUG_TOLLS_QUERY_PARAM = "debugTolls";

type TollIssueType =
  | "missing_toll"
  | "wrong_value"
  | "wrong_name"
  | "duplicate_toll"
  | "wrong_route"
  | "other";

const TOLL_ISSUE_TYPES: readonly { value: TollIssueType; label: string; description: string }[] = [
  {
    value: "missing_toll",
    label: "Pedágio faltando",
    description: "Uma praça que deveria aparecer não entrou no cálculo.",
  },
  {
    value: "wrong_value",
    label: "Valor errado",
    description: "O valor calculado não bate com a praça real.",
  },
  {
    value: "wrong_name",
    label: "Nome errado",
    description: "O nome, cidade ou concessionária estão incorretos.",
  },
  {
    value: "duplicate_toll",
    label: "Cobrança duplicada",
    description: "A mesma praça apareceu mais de uma vez.",
  },
  {
    value: "wrong_route",
    label: "Pedágio na rota errada",
    description: "A praça apareceu, mas não faz parte do trajeto.",
  },
  {
    value: "other",
    label: "Outro problema",
    description: "Algo diferente aconteceu com o cálculo do pedágio.",
  },
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

function isInternalTollDiagnosticsEnabled(isAdminAccessProfile: boolean): boolean {
  if (isAdminAccessProfile) return true;
  if (import.meta.env.DEV) return true;
  if (typeof window === "undefined") return false;

  const debugFromStorage = window.localStorage.getItem(DEBUG_TOLLS_STORAGE_KEY) === "true";
  const debugFromQuery = new URLSearchParams(window.location.search).get(DEBUG_TOLLS_QUERY_PARAM) === "1";

  return debugFromStorage || debugFromQuery;
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

function TollIssueTypeSelector({
  value,
  onChange,
}: {
  value: TollIssueType;
  onChange: (value: TollIssueType) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Tipo de problema" className="mt-2 grid grid-cols-1 gap-2">
      {TOLL_ISSUE_TYPES.map((item) => {
        const selected = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(item.value)}
            className={`rounded-2xl border p-3 text-left transition active:scale-[0.99] ${
              selected ? "border-primary/70 bg-primary/10 ring-2 ring-primary/15" : "border-border bg-background hover:border-primary/40 hover:bg-muted/20"
            }`}
          >
            <span className="flex items-start justify-between gap-3">
              <span className="min-w-0">
                <span className="block text-sm font-black text-foreground">{item.label}</span>
                <span className="mt-1 block text-xs text-muted-foreground">{item.description}</span>
              </span>
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                  selected ? "border-primary bg-primary" : "border-muted-foreground/40"
                }`}
              >
                {selected && <span className="h-2 w-2 rounded-full bg-primary-foreground" />}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function TollIssuePointSelector({
  value,
  onChange,
  items,
}: {
  value: string;
  onChange: (value: string) => void;
  items: TollRouteDiagnostic["items"];
}) {
  return (
    <div role="radiogroup" aria-label="Praça relacionada" className="mt-2 space-y-2">
      <button
        type="button"
        role="radio"
        aria-checked={value === ""}
        onClick={() => onChange("")}
        className={`w-full rounded-2xl border p-3 text-left transition active:scale-[0.99] ${
          value === "" ? "border-primary/70 bg-primary/10 ring-2 ring-primary/15" : "border-border bg-background hover:border-primary/40 hover:bg-muted/20"
        }`}
      >
        <span className="flex items-start justify-between gap-3">
          <span className="min-w-0">
            <span className="block text-sm font-black text-foreground">Praça que não apareceu</span>
            <span className="mt-1 block text-xs text-muted-foreground">Use esta opção quando o erro for em um pedágio ausente ou quando não souber qual selecionar.</span>
          </span>
          <span
            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
              value === "" ? "border-primary bg-primary" : "border-muted-foreground/40"
            }`}
          >
            {value === "" && <span className="h-2 w-2 rounded-full bg-primary-foreground" />}
          </span>
        </span>
      </button>

      <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
        {items.map((item) => {
          const selected = value === item.id;
          return (
            <button
              key={`${item.id}-${item.order}`}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(item.id)}
              className={`w-full rounded-2xl border p-3 text-left transition active:scale-[0.99] ${
                selected ? "border-primary/70 bg-primary/10 ring-2 ring-primary/15" : "border-border bg-background hover:border-primary/40 hover:bg-muted/20"
              }`}
            >
              <span className="flex items-start justify-between gap-3">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-black text-foreground">{item.name}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    #{item.order} • {item.road || "Rodovia não informada"}{item.km ? ` • KM ${item.km}` : ""}
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-2">
                  <span className="text-sm font-black text-profit">{formatTollCurrency(item.value)}</span>
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                      selected ? "border-primary bg-primary" : "border-muted-foreground/40"
                    }`}
                  >
                    {selected && <span className="h-2 w-2 rounded-full bg-primary-foreground" />}
                  </span>
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function TollDiagnosticFloatingPanel() {
  const { user } = useAuth();
  const accessProfileQuery = useAccessProfile(user?.id);
  const [diagnostic, setDiagnostic] = useState<TollRouteDiagnostic | null>(null);
  const [open, setOpen] = useState(false);
  const [buttonContainer, setButtonContainer] = useState<HTMLElement | null>(null);
  const [focusedTollId, setFocusedTollId] = useState<string | null>(null);
  const [focusRequestKey, setFocusRequestKey] = useState(0);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportType, setReportType] = useState<TollIssueType>("wrong_value");
  const [reportTollId, setReportTollId] = useState<string>("");
  const [reportMessage, setReportMessage] = useState("");
  const [reportSent, setReportSent] = useState(false);
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

  useEffect(() => {
    if (!open) return;
    setReportOpen(false);
    setReportSent(false);
    setReportMessage("");
    setReportTollId("");
    setReportType("wrong_value");
  }, [open, diagnostic]);

  const title = useMemo(() => {
    return diagnostic ? getTollDiagnosticTitle(diagnostic) : "Pedágios da rota";
  }, [diagnostic]);

  const isAdminAccessProfile =
    accessProfileQuery.data?.role === "admin" &&
    accessProfileQuery.data?.accessStatus === APPROVED_ACCESS_STATUS;

  const showInternalDiagnostics = useMemo(
    () => isInternalTollDiagnosticsEnabled(isAdminAccessProfile),
    [isAdminAccessProfile],
  );

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

  const handleIssueReportSubmit = () => {
    if (!diagnostic || typeof window === "undefined") return;

    const selectedToll = diagnostic.items.find((item) => item.id === reportTollId) ?? null;
    const reportPayload = {
      type: reportType,
      selectedTollId: reportTollId || null,
      selectedTollName: selectedToll?.name ?? null,
      message: reportMessage.trim() || null,
      createdAt: new Date().toISOString(),
      diagnosticSnapshot: diagnostic,
    };

    window.dispatchEvent(new CustomEvent("space-truck:toll-issue-report", { detail: reportPayload }));
    console.info("[Space Truck] Toll issue report payload", reportPayload);
    setReportSent(true);
  };

  if (!diagnostic) return null;

  const nearMissItems = diagnostic.nearMissItems ?? [];
  const reportTypeLabel = TOLL_ISSUE_TYPES.find((item) => item.value === reportType)?.label ?? "Erro no pedágio";

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

              <section className="mt-6 rounded-[1.75rem] border border-primary/25 bg-primary/5 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">Ajude a melhorar</p>
                    <h3 className="mt-1 text-lg font-black text-foreground">Encontrou algum erro no pedágio?</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Avise se faltou uma praça, se o valor parece errado ou se apareceu cobrança duplicada.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setReportOpen((current) => !current);
                      setReportSent(false);
                    }}
                    className="shrink-0 rounded-2xl border border-primary/30 bg-primary px-4 py-3 text-xs font-black text-primary-foreground shadow-sm transition active:scale-[0.98]"
                  >
                    Reportar erro
                  </button>
                </div>

                {reportOpen && (
                  <div className="mt-4 space-y-4 rounded-[1.5rem] border border-border bg-card p-4">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-muted-foreground">
                        Tipo de problema
                      </p>
                      <TollIssueTypeSelector
                        value={reportType}
                        onChange={(value) => {
                          setReportType(value);
                          setReportSent(false);
                        }}
                      />
                    </div>

                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-muted-foreground">
                        Praça relacionada
                      </p>
                      <TollIssuePointSelector
                        value={reportTollId}
                        onChange={(value) => {
                          setReportTollId(value);
                          setReportSent(false);
                        }}
                        items={diagnostic.items}
                      />
                    </div>

                    <div>
                      <label htmlFor="toll-issue-message" className="text-[11px] font-black uppercase tracking-[0.14em] text-muted-foreground">
                        Observação opcional
                      </label>
                      <textarea
                        id="toll-issue-message"
                        value={reportMessage}
                        onChange={(event) => {
                          setReportMessage(event.target.value);
                          setReportSent(false);
                        }}
                        placeholder="Ex: a praça apareceu duplicada, o valor estava diferente ou faltou um pedágio no trajeto."
                        className="mt-2 min-h-24 w-full rounded-2xl border border-border bg-background px-3 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground/70"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleIssueReportSubmit}
                      className="h-12 w-full rounded-2xl bg-primary text-sm font-black text-primary-foreground shadow-sm transition active:scale-[0.98]"
                    >
                      Enviar relatório
                    </button>

                    {reportSent && (
                      <div className="rounded-2xl border border-profit/30 bg-profit/10 p-3 text-xs font-semibold text-foreground">
                        Relatório registrado para revisão: {reportTypeLabel}. Obrigado por ajudar a melhorar a base de pedágios.
                      </div>
                    )}
                  </div>
                )}
              </section>

              {showInternalDiagnostics && nearMissItems.length > 0 && (
                <section className="mt-6 rounded-[1.75rem] border border-warning/30 bg-warning/5 p-4">
                  <div className="mb-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-warning">Diagnóstico interno</p>
                    <h3 className="mt-1 text-lg font-black text-foreground">Pedágios próximos não cobrados</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Visível apenas para admin aprovado ou modo interno.
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
