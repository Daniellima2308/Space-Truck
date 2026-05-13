import { useEffect, useMemo, useState } from "react";
import type { TollRouteDiagnostic } from "@/lib/tollApi";

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
  if (diagnostic.source === "no_route_path") return "Diagnóstico do pedágio";
  if (diagnostic.tollCount === 0) return "Nenhum pedágio encontrado";
  return `${diagnostic.tollCount} pedágio${diagnostic.tollCount === 1 ? "" : "s"} na rota`;
}

export function TollDiagnosticFloatingPanel() {
  const [diagnostic, setDiagnostic] = useState<TollRouteDiagnostic | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const current = window.__SPACE_TRUCK_LAST_TOLL_DIAGNOSTIC__;
    if (current) setDiagnostic(current);

    const handleDiagnostic = (event: Event) => {
      const detail = (event as CustomEvent<TollRouteDiagnostic>).detail;
      if (!detail) return;
      setDiagnostic(detail);
    };

    window.addEventListener("space-truck:toll-diagnostic", handleDiagnostic);
    return () => window.removeEventListener("space-truck:toll-diagnostic", handleDiagnostic);
  }, []);

  const title = useMemo(() => {
    return diagnostic ? getDiagnosticTitle(diagnostic) : "Diagnóstico do pedágio";
  }, [diagnostic]);

  if (!diagnostic) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-4 z-50 rounded-full border border-primary/40 bg-background/95 px-4 py-3 text-xs font-bold text-foreground shadow-xl backdrop-blur supports-[backdrop-filter]:bg-background/75"
      >
        {diagnostic.source === "no_route_path" ? "Ver diagnóstico" : `Ver ${diagnostic.tollCount} pedágio${diagnostic.tollCount === 1 ? "" : "s"}`}
      </button>

      {open && (
        <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="absolute inset-x-3 bottom-3 max-h-[86vh] overflow-hidden rounded-3xl border border-border bg-background shadow-2xl">
            <div className="sticky top-0 z-10 border-b border-border bg-background/95 p-4 backdrop-blur">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Space Truck</p>
                  <h2 className="text-lg font-black text-foreground">{title}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Total {formatCurrency(diagnostic.total)} • Fonte {diagnostic.source} • Corredor {diagnostic.routeCorridorKm} km
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-full border border-border px-3 py-2 text-sm font-bold text-foreground"
                >
                  Fechar
                </button>
              </div>
            </div>

            <div className="max-h-[70vh] overflow-y-auto p-4 pb-6">
              {diagnostic.reason && (
                <div className="mb-4 rounded-2xl border border-warning/30 bg-warning/10 p-3 text-sm text-foreground">
                  {diagnostic.reason}
                </div>
              )}

              {diagnostic.items.length === 0 ? (
                <div className="rounded-2xl border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                  Nenhuma praça foi listada neste diagnóstico. Se o campo de pedágio ficou como estimado, provavelmente a rota não entregou geometria suficiente para cruzar com a base interna.
                </div>
              ) : (
                <div className="space-y-3">
                  {diagnostic.items.map((item) => (
                    <div key={`${item.id}-${item.order}`} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">#{item.order} • {item.uf}</p>
                          <h3 className="mt-1 text-base font-black text-foreground">{item.name}</h3>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {item.road || "Rodovia não informada"}{item.km ? ` • KM ${item.km}` : ""}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {item.city || "Cidade não informada"} • {item.concessionaire || "Concessionária não informada"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-base font-black text-profit">{formatCurrency(item.value)}</p>
                          <p className="mt-1 text-[11px] text-muted-foreground">{item.distanceFromRouteKm} km da rota</p>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                        <span className="rounded-xl bg-muted/30 px-3 py-2">Após {item.distanceAlongRouteKm} km</span>
                        <span className="rounded-xl bg-muted/30 px-3 py-2">Sentido: {item.direction || "não informado"}</span>
                      </div>
                    </div>
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
