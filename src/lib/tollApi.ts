import { getRememberedRoutePath } from "@/lib/routeApi";
import {
  calculateRouteToll,
  type TollCalculationResult,
} from "@/lib/tollEngine";

export type TollApiCalculationResult = TollCalculationResult;

declare global {
  interface Window {
    __SPACE_TRUCK_LAST_TOLL_DIAGNOSTIC__?: TollRouteDiagnostic;
  }
}

export interface TollRouteDiagnosticItem {
  order: number;
  id: string;
  name: string;
  value: number;
  road: string | null;
  km: string | null;
  city: string | null;
  uf: string;
  concessionaire: string;
  direction: string | null;
  distanceAlongRouteKm: number;
  distanceFromRouteKm: number;
}

export interface TollRouteDiagnostic {
  total: number;
  tollCount: number;
  source: TollApiCalculationResult["source"];
  routeCorridorKm: number;
  items: TollRouteDiagnosticItem[];
}

export function calculateTollFromRememberedRoute(params: {
  originLat: number;
  originLng: number;
  destLat: number;
  destLng: number;
  axles: number;
}): TollApiCalculationResult | null {
  const routePath = getRememberedRoutePath({
    originLat: params.originLat,
    originLon: params.originLng,
    destLat: params.destLat,
    destLon: params.destLng,
  });

  if (!routePath) return null;

  return calculateRouteToll({
    routePath,
    axles: params.axles,
  });
}

function mapTollDiagnostic(result: TollApiCalculationResult): TollRouteDiagnostic {
  return {
    total: result.total,
    tollCount: result.matches.length,
    source: result.source,
    routeCorridorKm: result.routeCorridorKm,
    items: result.matches.map((match) => ({
      order: match.routeOrder,
      id: match.point.id,
      name: match.point.name,
      value: match.tollValue,
      road: match.point.road,
      km: match.point.km,
      city: match.point.city,
      uf: match.point.uf,
      concessionaire: match.point.concessionaire,
      direction: match.point.direction,
      distanceAlongRouteKm: match.distanceAlongRouteKm,
      distanceFromRouteKm: match.distanceFromRouteKm,
    })),
  };
}

function publishTollDiagnostic(diagnostic: TollRouteDiagnostic | null): void {
  if (typeof window === "undefined" || !diagnostic) return;

  window.__SPACE_TRUCK_LAST_TOLL_DIAGNOSTIC__ = diagnostic;

  console.info("[Space Truck] Diagnóstico de pedágios", {
    total: diagnostic.total,
    tollCount: diagnostic.tollCount,
    source: diagnostic.source,
    routeCorridorKm: diagnostic.routeCorridorKm,
  });
  console.table(diagnostic.items);
}

export function calculateTollDiagnosticFromRememberedRoute(params: {
  originLat: number;
  originLng: number;
  destLat: number;
  destLng: number;
  axles: number;
}): TollRouteDiagnostic | null {
  const result = calculateTollFromRememberedRoute(params);
  const diagnostic = result ? mapTollDiagnostic(result) : null;
  publishTollDiagnostic(diagnostic);
  return diagnostic;
}

export async function calculateToll(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
  axles: number,
): Promise<number | null> {
  const diagnostic = calculateTollDiagnosticFromRememberedRoute({
    originLat,
    originLng,
    destLat,
    destLng,
    axles,
  });

  return diagnostic?.total ?? null;
}
