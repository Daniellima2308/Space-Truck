import type { TollRouteDiagnostic } from "@/lib/tollApi";

const tollCurrencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatTollCurrency(value: number): string {
  return tollCurrencyFormatter.format(value);
}

export function getTollDiagnosticTitle(diagnostic: TollRouteDiagnostic): string {
  if (diagnostic.source === "no_route_path") return "Pedágios da rota";
  if (diagnostic.tollCount === 0) return "Nenhum pedágio encontrado";
  return `${diagnostic.tollCount} pedágio${diagnostic.tollCount === 1 ? "" : "s"} na rota`;
}

export function getTollDiagnosticSourceLabel(source: TollRouteDiagnostic["source"]): string {
  if (source === "space_truck_toll_base") return "Base Space Truck";
  if (source === "no_route_path") return "Sem geometria da rota";
  if (source === "no_toll_points_found") return "Sem pontos encontrados";
  if (source === "insufficient_route_geometry") return "Geometria insuficiente";
  return source;
}
