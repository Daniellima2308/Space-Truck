import type { Coordinates } from "@/lib/routeApi";
import {
  SPACE_TRUCK_TOLL_BASE_SOURCE,
  SPACE_TRUCK_TOLL_POINTS,
  type TollAxleCount,
  type TollPoint,
} from "@/lib/tollPoints";

const EARTH_RADIUS_KM = 6371;
const DEFAULT_ROUTE_CORRIDOR_KM = 0.08;
const MIN_ROUTE_POINTS_FOR_GEOMETRY = 2;
const SAME_ROUTE_POSITION_TOLERANCE_KM = 0.2;

export type TollCalculationSource =
  | typeof SPACE_TRUCK_TOLL_BASE_SOURCE
  | "insufficient_route_geometry"
  | "no_toll_points_found";

export interface TollPointMatch {
  point: TollPoint;
  tollValue: number;
  distanceFromRouteKm: number;
  distanceAlongRouteKm: number;
  routeOrder: number;
}

type TollPointCandidate = Omit<TollPointMatch, "routeOrder">;

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

interface RouteProjection {
  distanceFromRouteKm: number;
  distanceAlongRouteKm: number;
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

function getProjectionOnSegment(params: {
  point: Coordinates;
  segmentStart: Coordinates;
  segmentEnd: Coordinates;
  segmentLengthKm: number;
  accumulatedRouteKm: number;
}): RouteProjection {
  const { point, segmentStart, segmentEnd, segmentLengthKm, accumulatedRouteKm } = params;

  if (segmentLengthKm === 0) {
    return {
      distanceFromRouteKm: haversineDistanceKm(point, segmentStart),
      distanceAlongRouteKm: accumulatedRouteKm,
    };
  }

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

  if (denominator === 0) {
    return {
      distanceFromRouteKm: haversineDistanceKm(point, segmentStart),
      distanceAlongRouteKm: accumulatedRouteKm,
    };
  }

  const projection = Math.max(
    0,
    Math.min(1, ((xp - x1) * dx + (yp - y1) * dy) / denominator),
  );

  const closest: Coordinates = {
    lat: segmentStart.lat + (segmentEnd.lat - segmentStart.lat) * projection,
    lon: segmentStart.lon + (segmentEnd.lon - segmentStart.lon) * projection,
  };

  return {
    distanceFromRouteKm: haversineDistanceKm(point, closest),
    distanceAlongRouteKm: accumulatedRouteKm + segmentLengthKm * projection,
  };
}

function getProjectionFromNormalizedRoute(
  point: Coordinates,
  normalizedPath: Coordinates[],
): RouteProjection {
  if (normalizedPath.length < MIN_ROUTE_POINTS_FOR_GEOMETRY) {
    return {
      distanceFromRouteKm: Infinity,
      distanceAlongRouteKm: Infinity,
    };
  }

  let accumulatedRouteKm = 0;
  let bestProjection: RouteProjection = {
    distanceFromRouteKm: Infinity,
    distanceAlongRouteKm: Infinity,
  };

  for (let index = 0; index < normalizedPath.length - 1; index += 1) {
    const segmentStart = normalizedPath[index];
    const segmentEnd = normalizedPath[index + 1];
    const segmentLengthKm = haversineDistanceKm(segmentStart, segmentEnd);
    const projection = getProjectionOnSegment({
      point,
      segmentStart,
      segmentEnd,
      segmentLengthKm,
      accumulatedRouteKm,
    });

    if (projection.distanceFromRouteKm < bestProjection.distanceFromRouteKm) {
      bestProjection = projection;
    }

    accumulatedRouteKm += segmentLengthKm;
  }

  return bestProjection;
}

function getDistanceFromNormalizedRouteKm(
  point: Coordinates,
  normalizedPath: Coordinates[],
): number {
  return getProjectionFromNormalizedRoute(point, normalizedPath).distanceFromRouteKm;
}

function normalizePhysicalPointPart(value: string | null | undefined): string {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function buildPhysicalPointKey(match: TollPointCandidate): string {
  const { point } = match;
  const stableParts = [point.concessionaire, point.road, point.km, point.city]
    .map(normalizePhysicalPointPart)
    .filter(Boolean);

  return [
    ...stableParts,
    point.lat.toFixed(5),
    point.lon.toFixed(5),
  ].join("|");
}

function shouldTreatAsSameRouteCharge(a: TollPointCandidate, b: TollPointCandidate): boolean {
  const sameRoad = normalizePhysicalPointPart(a.point.road) === normalizePhysicalPointPart(b.point.road);
  const sameConcessionaire = normalizePhysicalPointPart(a.point.concessionaire) === normalizePhysicalPointPart(b.point.concessionaire);
  const sameCity = normalizePhysicalPointPart(a.point.city) === normalizePhysicalPointPart(b.point.city);
  const closeOnRoute = Math.abs(a.distanceAlongRouteKm - b.distanceAlongRouteKm) <= SAME_ROUTE_POSITION_TOLERANCE_KM;

  return closeOnRoute && (sameRoad || (sameConcessionaire && sameCity));
}

function chooseBestPhysicalMatch(current: TollPointCandidate | undefined, next: TollPointCandidate): TollPointCandidate {
  if (!current) return next;
  if (next.tollValue > current.tollValue) return next;
  if (next.tollValue === current.tollValue && next.distanceFromRouteKm < current.distanceFromRouteKm) return next;
  return current;
}

function dedupePhysicalTollMatches(matches: TollPointCandidate[]): TollPointCandidate[] {
  const byPhysicalPoint = new Map<string, TollPointCandidate>();

  for (const match of matches) {
    const key = buildPhysicalPointKey(match);
    byPhysicalPoint.set(key, chooseBestPhysicalMatch(byPhysicalPoint.get(key), match));
  }

  const ordered = [...byPhysicalPoint.values()].sort((a, b) => a.distanceAlongRouteKm - b.distanceAlongRouteKm);
  const deduped: TollPointCandidate[] = [];

  for (const match of ordered) {
    const duplicateIndex = deduped.findIndex((current) => shouldTreatAsSameRouteCharge(current, match));

    if (duplicateIndex === -1) {
      deduped.push(match);
      continue;
    }

    deduped[duplicateIndex] = chooseBestPhysicalMatch(deduped[duplicateIndex], match);
  }

  return deduped;
}

function orderTollMatches(matches: TollPointCandidate[]): TollPointMatch[] {
  return [...matches]
    .sort((a, b) => (
      a.distanceAlongRouteKm - b.distanceAlongRouteKm ||
      a.distanceFromRouteKm - b.distanceFromRouteKm
    ))
    .map((match, index) => ({
      ...match,
      routeOrder: index + 1,
    }));
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

  const matches = orderTollMatches(
    dedupePhysicalTollMatches(
      tollPoints
        .map((point) => {
          const tollValue = point.tariffs[normalizedAxles];
          if (typeof tollValue !== "number" || tollValue <= 0) return null;

          const projection = getProjectionFromNormalizedRoute(
            { lat: point.lat, lon: point.lon },
            normalizedPath,
          );

          if (projection.distanceFromRouteKm > routeCorridorKm) return null;

          return {
            point,
            tollValue,
            distanceFromRouteKm: round2(projection.distanceFromRouteKm),
            distanceAlongRouteKm: round2(projection.distanceAlongRouteKm),
          } satisfies TollPointCandidate;
        })
        .filter((match): match is TollPointCandidate => Boolean(match)),
    ),
  );

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
