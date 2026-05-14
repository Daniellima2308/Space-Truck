import { getRememberedRoutePath, type Coordinates } from "@/lib/routeApi";
import {
  calculateRouteToll,
  type TollCalculationResult,
} from "@/lib/tollEngine";

export type TollApiCalculationResult = TollCalculationResult;
export type TollRouteDiagnosticSource = TollApiCalculationResult["source"] | "no_route_path";

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
  lat: number;
  lon: number;
  distanceAlongRouteKm: number;
  distanceFromRouteKm: number;
}

export interface TollRouteDiagnostic {
  total: number;
  tollCount: number;
  source: TollRouteDiagnosticSource;
  routeCorridorKm: number;
  routePath: Coordinates[];
  items: TollRouteDiagnosticItem[];
  reason?: string;
}

function publishTollDiagnostic(diagnostic: TollRouteDiagnostic): void {
  if (typeof window === "undefined") return;

  window.__SPACE_TRUCK_LAST_TOLL_DIAGNOSTIC__ = diagnostic;
  window.dispatchEvent(new CustomEvent("space-truck:toll-diagnostic", { detail: diagnostic }));
}

function buildNoRoutePathDiagnostic(): TollRouteDiagnostic {
  return {
    total: 0,
    tollCount: 0,
    source: "no_route_path",
    routeCorridorKm: 0,
    routePath: [],
    items: [],
    reason: "A distância da rota existe, mas a geometria não ficou disponível para cruzar com a base interna de pedágios.",
  };
}

function mapTollDiagnostic(result: TollApiCalculationResult, routePath: Coordinates[]): TollRouteDiagnostic {
  return {
    total: result.total,
    tollCount: result.matches.length,
    source: result.source,
    routeCorridorKm: result.routeCorridorKm,
    routePath,
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
      lat: match.point.lat,
      lon: match.point.lon,
      distanceAlongRouteKm: match.distanceAlongRouteKm,
      distanceFromRouteKm: match.distanceFromRouteKm,
    })),
  };
}

function getRoutePathForParams(params: {
  originLat: number;
  originLng: number;
  destLat: number;
  destLng: number;
}): Coordinates[] | null {
  return getRememberedRoutePath({
    originLat: params.originLat,
    originLon: params.originLng,
    destLat: params.destLat,
    destLon: params.destLng,
  });
}

export function calculateTollFromRememberedRoute(params: {
  originLat: number;
  originLng: number;
  destLat: number;
  destLng: number;
  axles: number;
}): TollApiCalculationResult | null {
  const routePath = getRoutePathForParams(params);
  if (!routePath) return null;

  return calculateRouteToll({
    routePath,
    axles: params.axles,
  });
}

export function calculateTollDiagnosticFromRememberedRoute(params: {
  originLat: number;
  originLng: number;
  destLat: number;
  destLng: number;
  axles: number;
}): TollRouteDiagnostic {
  const routePath = getRoutePathForParams(params);
  if (!routePath) {
    const diagnostic = buildNoRoutePathDiagnostic();
    publishTollDiagnostic(diagnostic);
    return diagnostic;
  }

  const result = calculateRouteToll({
    routePath,
    axles: params.axles,
  });
  const diagnostic = mapTollDiagnostic(result, routePath);
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

  return diagnostic.source === "no_route_path" ? null : diagnostic.total;
}
