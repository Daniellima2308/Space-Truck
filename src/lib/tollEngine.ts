import type { Coordinates, RouteSegment } from "@/lib/routeApi";
import {
  SPACE_TRUCK_TOLL_BASE_SOURCE,
  SPACE_TRUCK_TOLL_POINTS,
  type TollAxleCount,
  type TollDirectionNormalized,
  type TollPoint,
} from "@/lib/tollPoints";

const EARTH_RADIUS_KM = 6371;
const DEFAULT_ROUTE_CORRIDOR_KM = 0.05;
const BR116_PFE_ROUTE_CORRIDOR_KM = 0.02;
const MIN_ROUTE_POINTS_FOR_GEOMETRY = 2;
const SAME_ROUTE_POSITION_TOLERANCE_KM = 0.2;

type InferredRoadDirection = Extract<TollDirectionNormalized, "increasing" | "decreasing"> | "unknown";

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
  routeSegmentIndex: number;
  routeBearingDegrees: number;
  matchedRouteRoads: string[];
}

type TollPointCandidate = Omit<TollPointMatch, "routeOrder">;
type DirectionalTollPointCandidate = TollPointCandidate & {
  inferredRoadDirection: InferredRoadDirection;
};

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
  routeSegments?: readonly RouteSegment[];
}

interface RouteProjection {
  distanceFromRouteKm: number;
  distanceAlongRouteKm: number;
  routeSegmentIndex: number;
  routeBearingDegrees: number;
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function toDegrees(value: number): number {
  return (value * 180) / Math.PI;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundBearing(value: number): number {
  return Math.round(((value % 360) + 360) % 360);
}

function getBearingDifferenceDegrees(a: number, b: number): number {
  const diff = Math.abs(roundBearing(a) - roundBearing(b));
  return Math.min(diff, 360 - diff);
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

function calculateBearingDegrees(start: Coordinates, end: Coordinates): number {
  const startLat = toRadians(start.lat);
  const endLat = toRadians(end.lat);
  const deltaLon = toRadians(end.lon - start.lon);
  const y = Math.sin(deltaLon) * Math.cos(endLat);
  const x = Math.cos(startLat) * Math.sin(endLat) - Math.sin(startLat) * Math.cos(endLat) * Math.cos(deltaLon);

  return roundBearing(toDegrees(Math.atan2(y, x)));
}

function getProjectionOnSegment(params: {
  point: Coordinates;
  segmentStart: Coordinates;
  segmentEnd: Coordinates;
  segmentLengthKm: number;
  accumulatedRouteKm: number;
  routeSegmentIndex: number;
}): RouteProjection {
  const { point, segmentStart, segmentEnd, segmentLengthKm, accumulatedRouteKm, routeSegmentIndex } = params;
  const routeBearingDegrees = calculateBearingDegrees(segmentStart, segmentEnd);

  if (segmentLengthKm === 0) {
    return {
      distanceFromRouteKm: haversineDistanceKm(point, segmentStart),
      distanceAlongRouteKm: accumulatedRouteKm,
      routeSegmentIndex,
      routeBearingDegrees,
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
      routeSegmentIndex,
      routeBearingDegrees,
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
    routeSegmentIndex,
    routeBearingDegrees,
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
      routeSegmentIndex: -1,
      routeBearingDegrees: 0,
    };
  }

  let accumulatedRouteKm = 0;
  let bestProjection: RouteProjection = {
    distanceFromRouteKm: Infinity,
    distanceAlongRouteKm: Infinity,
    routeSegmentIndex: -1,
    routeBearingDegrees: 0,
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
      routeSegmentIndex: index,
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

function getRouteRoadsForSegment(
  routeSegmentIndex: number,
  routeSegments: readonly RouteSegment[],
): string[] {
  if (routeSegmentIndex < 0 || routeSegments.length === 0) return [];

  return [...new Set(
    routeSegments
      .filter((segment) => (
        segment.startPointIndex <= routeSegmentIndex &&
        routeSegmentIndex < segment.endPointIndex
      ))
      .flatMap((segment) => segment.roadNumbersNormalized),
  )];
}

function hasCompatibleRouteRoad(
  point: TollPoint,
  matchedRouteRoads: string[],
): boolean {
  if (matchedRouteRoads.length === 0) return true;
  if (!point.roadNormalized) return true;
  return matchedRouteRoads.includes(point.roadNormalized);
}

function isBr116PfeFreeFlow(point: TollPoint): boolean {
  const identity = `${point.id} ${point.name}`.toLowerCase();
  return point.roadNormalized === "BR-116" && /\bpfe\d{3}\b/.test(identity);
}

function getPointRouteCorridorKm(point: TollPoint, routeCorridorKm: number): number {
  if (typeof point.routeCorridorKm === "number" && point.routeCorridorKm > 0) {
    return Math.min(routeCorridorKm, point.routeCorridorKm);
  }

  if (isBr116PfeFreeFlow(point)) {
    return Math.min(routeCorridorKm, BR116_PFE_ROUTE_CORRIDOR_KM);
  }

  return routeCorridorKm;
}

function hasCompatibleBearing(point: TollPoint, routeBearingDegrees: number): boolean {
  if (typeof point.expectedHeadingDegrees !== "number" || typeof point.headingToleranceDegrees !== "number") {
    return true;
  }

  return getBearingDifferenceDegrees(routeBearingDegrees, point.expectedHeadingDegrees) <= point.headingToleranceDegrees;
}

function normalizePhysicalPointPart(value: string | null | undefined): string {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(sentido|pista|faixa|direcao|direção)\b/g, "")
    .replace(/\b(crescente|decrescente|norte|sul|leste|oeste|capital|interior|ida|volta)\b/g, "")
    .replace(/\b(sp|sao paulo|são paulo|rio|rj)\b/g, "")
    .replace(/[-–—_/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isSameNonEmptyPhysicalPart(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const normalizedA = normalizePhysicalPointPart(a);
  const normalizedB = normalizePhysicalPointPart(b);

  return Boolean(normalizedA && normalizedB && normalizedA === normalizedB);
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

function hasSameDirectionalChargeGroup(a: TollPointCandidate, b: TollPointCandidate): boolean {
  const sameKm = isSameNonEmptyPhysicalPart(a.point.km, b.point.km);
  const sameRoad = isSameNonEmptyPhysicalPart(a.point.road, b.point.road);
  const sameConcessionaire = isSameNonEmptyPhysicalPart(a.point.concessionaire, b.point.concessionaire);
  const sameCity = isSameNonEmptyPhysicalPart(a.point.city, b.point.city);
  const sameName = isSameNonEmptyPhysicalPart(a.point.name, b.point.name);

  if (sameKm && sameRoad && sameConcessionaire && (sameCity || sameName)) {
    return true;
  }

  if (sameKm && sameRoad && sameCity && sameName) {
    return true;
  }

  return false;
}

function shouldTreatAsSameRouteCharge(a: TollPointCandidate, b: TollPointCandidate): boolean {
  if (a.point.chargeGroupId && b.point.chargeGroupId && a.point.chargeGroupId === b.point.chargeGroupId) {
    return true;
  }

  if (hasSameDirectionalChargeGroup(a, b)) {
    return true;
  }

  const closeOnRoute = Math.abs(a.distanceAlongRouteKm - b.distanceAlongRouteKm) <= SAME_ROUTE_POSITION_TOLERANCE_KM;
  if (!closeOnRoute) return false;

  const sameKm = isSameNonEmptyPhysicalPart(a.point.km, b.point.km);
  const sameRoad = isSameNonEmptyPhysicalPart(a.point.road, b.point.road);
  const sameConcessionaire = isSameNonEmptyPhysicalPart(a.point.concessionaire, b.point.concessionaire);
  const sameCity = isSameNonEmptyPhysicalPart(a.point.city, b.point.city);
  const sameName = isSameNonEmptyPhysicalPart(a.point.name, b.point.name);

  return (
    (sameKm && (sameRoad || sameConcessionaire || sameCity)) ||
    (sameName && sameConcessionaire && (sameRoad || sameCity))
  );
}

function chooseBestPhysicalMatch(current: TollPointCandidate | undefined, next: TollPointCandidate): TollPointCandidate {
  if (!current) return next;
  if (next.tollValue > current.tollValue) return next;
  if (next.tollValue === current.tollValue && next.distanceFromRouteKm < current.distanceFromRouteKm) return next;
  return current;
}

function getRoadInferenceKey(match: TollPointCandidate): string | null {
  if (!match.point.roadNormalized || match.point.kmNumber === null) return null;
  return [
    match.point.roadNormalized,
    match.point.uf,
    match.point.concessionaire,
  ]
    .map(normalizePhysicalPointPart)
    .filter(Boolean)
    .join("|") || null;
}

function inferRoadDirections(matches: TollPointCandidate[]): Map<string, InferredRoadDirection> {
  const grouped = matches.reduce((groups, match) => {
    const key = getRoadInferenceKey(match);
    if (!key) return groups;
    const group = groups.get(key) ?? [];
    group.push(match);
    groups.set(key, group);
    return groups;
  }, new Map<string, TollPointCandidate[]>());

  const inferred = new Map<string, InferredRoadDirection>();

  for (const [road, group] of grouped) {
    const ordered = [...group]
      .filter((match) => match.point.kmNumber !== null)
      .sort((a, b) => a.distanceAlongRouteKm - b.distanceAlongRouteKm);

    const first = ordered[0];
    const last = ordered[ordered.length - 1];
    const firstKm = first?.point.kmNumber;
    const lastKm = last?.point.kmNumber;

    if (ordered.length < 2 || firstKm === null || firstKm === undefined || lastKm === null || lastKm === undefined) {
      inferred.set(road, "unknown");
      continue;
    }

    const kmDelta = lastKm - firstKm;
    if (Math.abs(kmDelta) < 0.1) {
      inferred.set(road, "unknown");
      continue;
    }

    inferred.set(road, kmDelta > 0 ? "increasing" : "decreasing");
  }

  return inferred;
}

function attachInferredRoadDirection(
  matches: TollPointCandidate[],
  inferredDirections: Map<string, InferredRoadDirection>,
): DirectionalTollPointCandidate[] {
  return matches.map((match) => ({
    ...match,
    inferredRoadDirection: getRoadInferenceKey(match)
      ? inferredDirections.get(getRoadInferenceKey(match) as string) ?? "unknown"
      : "unknown",
  }));
}

function hasCompatibleDirection(match: DirectionalTollPointCandidate): boolean {
  if (match.inferredRoadDirection === "unknown") return true;
  if (match.point.directionNormalized === "both" || match.point.directionNormalized === "unknown") return true;
  return match.point.directionNormalized === match.inferredRoadDirection;
}

function filterDirectionIncompatibleMatches(matches: TollPointCandidate[]): TollPointCandidate[] {
  const inferredDirections = inferRoadDirections(matches);
  return attachInferredRoadDirection(matches, inferredDirections).filter(hasCompatibleDirection);
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
  routeSegments = [],
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

  const routeCandidates = tollPoints
    .map((point) => {
      const tollValue = point.tariffs[normalizedAxles];
      if (typeof tollValue !== "number" || tollValue <= 0) return null;

      const projection = getProjectionFromNormalizedRoute(
        { lat: point.lat, lon: point.lon },
        normalizedPath,
      );
      const pointRouteCorridorKm = getPointRouteCorridorKm(point, routeCorridorKm);

      if (projection.distanceFromRouteKm > pointRouteCorridorKm) return null;

      const matchedRouteRoads = getRouteRoadsForSegment(projection.routeSegmentIndex, routeSegments);
      if (!hasCompatibleRouteRoad(point, matchedRouteRoads)) return null;
      if (!hasCompatibleBearing(point, projection.routeBearingDegrees)) return null;

      return {
        point,
        tollValue,
        distanceFromRouteKm: round2(projection.distanceFromRouteKm),
        distanceAlongRouteKm: round2(projection.distanceAlongRouteKm),
        routeSegmentIndex: projection.routeSegmentIndex,
        routeBearingDegrees: projection.routeBearingDegrees,
        matchedRouteRoads,
      } satisfies TollPointCandidate;
    })
    .filter((match): match is TollPointCandidate => Boolean(match));

  const matches = orderTollMatches(
    dedupePhysicalTollMatches(
      filterDirectionIncompatibleMatches(routeCandidates),
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
