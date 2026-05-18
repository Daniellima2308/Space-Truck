import {
  getRememberedRouteGeometry,
  type Coordinates,
  type RouteSegment,
} from "@/lib/routeApi";
import {
  calculateRouteToll,
  type TollCalculationResult,
} from "@/lib/tollEngine";
import {
  getRouteTollDiagnostics,
  type TollPointRejectionReason,
} from "@/lib/tollDiagnostics";

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

export interface TollRouteNearMissItem {
  id: string;
  name: string;
  value: number;
  reason: TollPointRejectionReason;
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
  routeCorridorKm: number;
  matchedRouteRoads: string[];
  inferredRoadDirection: "increasing" | "decreasing" | "unknown";
}

export interface TollRouteDiagnostic {
  total: number;
  tollCount: number;
  source: TollRouteDiagnosticSource;
  routeCorridorKm: number;
  routePath: Coordinates[];
  routeSegments: RouteSegment[];
  items: TollRouteDiagnosticItem[];
  nearMissItems: TollRouteNearMissItem[];
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
    routeSegments: [],
    items: [],
    nearMissItems: [],
    reason: "A distância da rota existe, mas a geometria não ficou disponível para cruzar com a base interna de pedágios.",
  };
}

function mapTollDiagnostic(
  result: TollApiCalculationResult,
  routePath: Coordinates[],
  routeSegments: RouteSegment[],
  axles: number,
): TollRouteDiagnostic {
  const nearMissItems = getRouteTollDiagnostics({
    routePath,
    routeSegments,
    axles,
  }).map((item) => ({
    id: item.point.id,
    name: item.point.name,
    value: item.tollValue,
    reason: item.reason,
    road: item.point.road,
    km: item.point.km,
    city: item.point.city,
    uf: item.point.uf,
    concessionaire: item.point.concessionaire,
    direction: item.point.direction,
    lat: item.point.lat,
    lon: item.point.lon,
    distanceAlongRouteKm: item.distanceAlongRouteKm,
    distanceFromRouteKm: item.distanceFromRouteKm,
    routeCorridorKm: item.routeCorridorKm,
    matchedRouteRoads: item.matchedRouteRoads,
    inferredRoadDirection: item.inferredRoadDirection,
  }));

  return {
    total: result.total,
    tollCount: result.matches.length,
    source: result.source,
    routeCorridorKm: result.routeCorridorKm,
    routePath,
    routeSegments,
    nearMissItems,
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

function getRouteGeometryForParams(params: {
  originLat: number;
  originLng: number;
  destLat: number;
  destLng: number;
}): { routePath: Coordinates[]; routeSegments: RouteSegment[] } | null {
  return getRememberedRouteGeometry({
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
  const routeGeometry = getRouteGeometryForParams(params);
  if (!routeGeometry) return null;

  return calculateRouteToll({
    routePath: routeGeometry.routePath,
    routeSegments: routeGeometry.routeSegments,
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
  const routeGeometry = getRouteGeometryForParams(params);
  if (!routeGeometry) {
    const diagnostic = buildNoRoutePathDiagnostic();
    publishTollDiagnostic(diagnostic);
    return diagnostic;
  }

  const result = calculateRouteToll({
    routePath: routeGeometry.routePath,
    routeSegments: routeGeometry.routeSegments,
    axles: params.axles,
  });
  const diagnostic = mapTollDiagnostic(
    result,
    routeGeometry.routePath,
    routeGeometry.routeSegments,
    params.axles,
  );
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
