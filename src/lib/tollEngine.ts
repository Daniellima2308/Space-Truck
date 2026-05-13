import type { Coordinates } from "@/lib/routeApi";
import {
  SPACE_TRUCK_TOLL_BASE_SOURCE,
  SPACE_TRUCK_TOLL_POINTS,
  type TollAxleCount,
  type TollPoint,
} from "@/lib/tollPoints";

const EARTH_RADIUS_KM = 6371;
const DEFAULT_ROUTE_CORRIDOR_KM = 2.5;
const MIN_ROUTE_POINTS_FOR_GEOMETRY = 2;

export type TollCalculationSource =
  | typeof SPACE_TRUCK_TOLL_BASE_SOURCE
  | "insufficient_route_geometry"
  | "no_toll_points_found";

export interface TollPointMatch {
  point: TollPoint;
  tollValue: number;
  distanceFromRouteKm: number;
}

export interface TollCalculationResult {
  total: number;
  source: TollCalculationSource;
  matches: TollPointMatch[];
  routeCorridorKm: number;
}

export interface CalculateRouteTollParams {
  routePath: Coordinates[];
  axles: number;
  tollPoints?: readonly TollPoint[];
  routeCorridorKm?: number;
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function isValidCoordinate(point: Coordinates): boolean {
  return (
    typeof point.lat === "number" &&
    typeof point.lon === "number" &&
    Number.isFinite(point.lat) &&
    Number.isFinite(point.lon) &&
    Math.abs(point.lat) <= 90 &&
    Math.abs(point.lon) <= 180
  );
}

function normalizeRoutePath(routePath: Coordinates[]): Coordinates[] {
  return routePath.filter(isValidCoordinate);
}

function normalizeAxles(axles: number): TollAxleCount | null {
  if ([2, 3, 4, 5, 6, 7, 8, 9].includes(axles)) {
    return axles as TollAxleCount;
  }

  return null;
}

function haversineDistanceKm(a: Coordinates, b: Coordinates): number {
  const deltaLat = toRadians(b.lat - a.lat);
  const deltaLon = toRadians(b.lon - a.lon);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const h =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

function bearingProjectionDistanceKm(
  point: Coordinates,
  segmentStart: Coordinates,
  segmentEnd: Coordinates,
): number {
  const segmentLengthKm = haversineDistanceKm(segmentStart, segmentEnd);
  if (segmentLengthKm === 0) return haversineDistanceKm(point, segmentStart);

  const latRef = toRadians((segmentStart.lat + segmentEnd.lat + point.lat) / 3);
  const x1 = EARTH_RADIUS_KM * toRadians(segmentStart.lon) * Math.cos(latRef);
  const y1 = EARTH_RADIUS_KM * toRadians(segmentStart.lat);
  const x2 = EARTH_RADIUS_KM * toRadians(segmentEnd.lon) * Math.cos(latRef);
  const y2 = EARTH_RADIUS_KM * toRadians(segmentEnd.lat);
  const xp = EARTH_RADIUS_KM * toRadians(point.lon) * Math.cos(latRef);
  const yp = EARTH_RADIUS_KM * toRadians(point.lat);

  const dx = x2 - x1;
  const dy = y2 - y1;
  const denominator = dx * dx + dy * dy;
  if (denominator === 0) return haversineDistanceKm(point, segmentStart);

  const projection = Math.max(
    0,
    Math.min(1, ((xp - x1) * dx + (yp - y1) * dy) / denominator),
  );

  const closest: Coordinates = {
    lat: segmentStart.lat + (segmentEnd.lat - segmentStart.lat) * projection,
    lon: segmentStart.lon + (segmentEnd.lon - segmentStart.lon) * projection,
  };

  return haversineDistanceKm(point, closest);
}

function getDistanceFromNormalizedRouteKm(
  point: Coordinates,
  normalizedPath: Coordinates[],
): number {
  if (normalizedPath.length < MIN_ROUTE_POINTS_FOR_GEOMETRY) return Infinity;

  let minDistance = Infinity;

  for (let index = 0; index < normalizedPath.length - 1; index += 1) {
    const distance = bearingProjectionDistanceKm(
      point,
      normalizedPath[index],
      normalizedPath[index + 1],
    );
    minDistance = Math.min(minDistance, distance);
  }

  return minDistance;
}

export function getDistanceFromRouteKm(
  point: Coordinates,
  routePath: Coordinates[],
): number {
  return getDistanceFromNormalizedRouteKm(point, normalizeRoutePath(routePath));
}

export function calculateRouteToll({
  routePath,
  axles,
  tollPoints = SPACE_TRUCK_TOLL_POINTS,
  routeCorridorKm = DEFAULT_ROUTE_CORRIDOR_KM,
}: CalculateRouteTollParams): TollCalculationResult {
  const normalizedPath = normalizeRoutePath(routePath);
  const normalizedAxles = normalizeAxles(axles);

  if (normalizedPath.length < MIN_ROUTE_POINTS_FOR_GEOMETRY || !normalizedAxles) {
    return {
      total: 0,
      source: "insufficient_route_geometry",
      matches: [],
      routeCorridorKm,
    };
  }

  const matches = tollPoints
    .map((point) => {
      const tollValue = point.tariffs[normalizedAxles];
      if (typeof tollValue !== "number" || tollValue <= 0) return null;

      const distanceFromRouteKm = getDistanceFromNormalizedRouteKm(
        { lat: point.lat, lon: point.lon },
        normalizedPath,
      );

      if (distanceFromRouteKm > routeCorridorKm) return null;

      return {
        point,
        tollValue,
        distanceFromRouteKm: round2(distanceFromRouteKm),
      } satisfies TollPointMatch;
    })
    .filter((match): match is TollPointMatch => Boolean(match))
    .sort((a, b) => a.distanceFromRouteKm - b.distanceFromRouteKm);

  if (matches.length === 0) {
    return {
      total: 0,
      source: "no_toll_points_found",
      matches: [],
      routeCorridorKm,
    };
  }

  return {
    total: round2(matches.reduce((sum, match) => sum + match.tollValue, 0)),
    source: SPACE_TRUCK_TOLL_BASE_SOURCE,
    matches,
    routeCorridorKm,
  };
}
