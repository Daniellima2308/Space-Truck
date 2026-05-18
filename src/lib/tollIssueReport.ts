import type { TollRouteDiagnostic, TollRouteDiagnosticItem } from "@/lib/tollApi";

export type TollIssueType =
  | "missing_toll"
  | "wrong_value"
  | "wrong_name"
  | "duplicate_toll"
  | "wrong_route"
  | "other";

export interface TollIssueReportPayload {
  type: TollIssueType;
  selectedTollId: string | null;
  selectedTollOrder: number | null;
  selectedTollName: string | null;
  message: string | null;
  createdAt: string;
  diagnosticSummary: {
    source: TollRouteDiagnostic["source"];
    tollCount: number;
    total: number;
    routeCorridorKm: number;
    chargedTolls: Array<{
      id: string;
      order: number;
      name: string;
      value: number;
      road: string | null;
      km: string | null;
      city: string | null;
      uf: string;
      concessionaire: string;
    }>;
  };
}

const TOLL_SELECTION_SEPARATOR = ":";

export function getTollIssueSelectionKey(
  item: Pick<TollRouteDiagnosticItem, "id" | "order">,
): string {
  return `${encodeURIComponent(item.id)}${TOLL_SELECTION_SEPARATOR}${item.order}`;
}

export function findTollIssueSelection(
  items: TollRouteDiagnosticItem[],
  selectionKey: string,
): TollRouteDiagnosticItem | null {
  if (!selectionKey) return null;

  const separatorIndex = selectionKey.lastIndexOf(TOLL_SELECTION_SEPARATOR);
  if (separatorIndex <= 0 || separatorIndex === selectionKey.length - 1) return null;

  const id = decodeURIComponent(selectionKey.slice(0, separatorIndex));
  const order = Number(selectionKey.slice(separatorIndex + 1));
  if (!Number.isFinite(order)) return null;

  return items.find((item) => item.id === id && item.order === order) ?? null;
}

export function createTollIssueReportPayload(params: {
  type: TollIssueType;
  selectedTollKey: string;
  message: string;
  diagnostic: TollRouteDiagnostic;
  createdAt?: string;
}): TollIssueReportPayload {
  const selectedToll = findTollIssueSelection(params.diagnostic.items, params.selectedTollKey);

  return {
    type: params.type,
    selectedTollId: selectedToll?.id ?? null,
    selectedTollOrder: selectedToll?.order ?? null,
    selectedTollName: selectedToll?.name ?? null,
    message: params.message.trim() || null,
    createdAt: params.createdAt ?? new Date().toISOString(),
    diagnosticSummary: {
      source: params.diagnostic.source,
      tollCount: params.diagnostic.tollCount,
      total: params.diagnostic.total,
      routeCorridorKm: params.diagnostic.routeCorridorKm,
      chargedTolls: params.diagnostic.items.map((item) => ({
        id: item.id,
        order: item.order,
        name: item.name,
        value: item.value,
        road: item.road,
        km: item.km,
        city: item.city,
        uf: item.uf,
        concessionaire: item.concessionaire,
      })),
    },
  };
}
