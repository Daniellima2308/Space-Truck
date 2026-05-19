import type { TollPoint } from "@/lib/tollPoints";

const BR116_PFE_ROUTE_CORRIDOR_KM = 0.02;
export const ROUTE_CORRIDOR_EDGE_TOLERANCE_KM = 0.005;

function isBr116PfeFreeFlow(point: TollPoint): boolean {
  const identity = `${point.id} ${point.name}`.toLowerCase();
  return point.roadNormalized === "BR-116" && /\bpfe\d{3}\b/.test(identity);
}

function getBasePointRouteCorridorKm(point: TollPoint, routeCorridorKm: number): number {
  if (typeof point.routeCorridorKm === "number" && point.routeCorridorKm > 0) {
    return Math.min(routeCorridorKm, point.routeCorridorKm);
  }

  if (isBr116PfeFreeFlow(point)) {
    return Math.min(routeCorridorKm, BR116_PFE_ROUTE_CORRIDOR_KM);
  }

  return routeCorridorKm;
}

export function getPointRouteCorridorKm(point: TollPoint, routeCorridorKm: number): number {
  return getBasePointRouteCorridorKm(point, routeCorridorKm);
}

export function isInsidePointRouteCorridor(params: {
  distanceFromRouteKm: number;
  point: TollPoint;
  routeCorridorKm: number;
}): boolean {
  const pointRouteCorridorKm = getBasePointRouteCorridorKm(params.point, params.routeCorridorKm);
  return params.distanceFromRouteKm <= pointRouteCorridorKm + ROUTE_CORRIDOR_EDGE_TOLERANCE_KM;
}
