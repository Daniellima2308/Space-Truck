import { describe, expect, it } from "vitest";
import { calculateRouteToll } from "@/lib/tollEngine";
import type { RouteSegment } from "@/lib/routeApi";
import type { TollPoint } from "@/lib/tollPoints";

function buildTollPoint(overrides: Partial<TollPoint> & Pick<TollPoint, "id" | "road" | "roadNormalized" | "lat" | "lon">): TollPoint {
  return {
    id: overrides.id,
    name: overrides.name ?? `Praça ${overrides.id}`,
    uf: overrides.uf ?? "SP",
    regulator: overrides.regulator ?? "ARTESP",
    jurisdiction: overrides.jurisdiction ?? "estadual",
    concessionaire: overrides.concessionaire ?? "Concessionária teste",
    road: overrides.road,
    roadNormalized: overrides.roadNormalized,
    km: overrides.km ?? "24,000",
    kmNumber: overrides.kmNumber ?? 24,
    city: overrides.city ?? "Osasco",
    direction: overrides.direction ?? "ambos",
    directionNormalized: overrides.directionNormalized ?? "both",
    lat: overrides.lat,
    lon: overrides.lon,
    tariffs: overrides.tariffs ?? { 6: 10 },
    geoConfidence: overrides.geoConfidence ?? "alta",
    valueConfidence: overrides.valueConfidence ?? "alta",
    coordinateRole: overrides.coordinateRole ?? "plaza_center",
    expectedHeadingDegrees: overrides.expectedHeadingDegrees ?? null,
    headingToleranceDegrees: overrides.headingToleranceDegrees ?? null,
  };
}

const sp021RouteSegments: RouteSegment[] = [
  {
    startPointIndex: 0,
    endPointIndex: 1,
    roadNames: ["SP-021"],
    roadNumbers: ["SP-021"],
    roadNumbersNormalized: ["SP-021"],
    source: "importantRoadStretch",
  },
];

describe("zero-padded toll road matching", () => {
  it("keeps SP-021 compatible with route segments and manual coordinate overrides", () => {
    const result = calculateRouteToll({
      routePath: [
        { lat: 0, lon: 0 },
        { lat: 0, lon: 1 },
      ],
      routeSegments: sp021RouteSegments,
      routeCorridorKm: 1,
      axles: 6,
      tollPoints: [
        buildTollPoint({
          id: "sp-021-match",
          road: "SP-021",
          roadNormalized: "SP-021",
          lat: 0.0001,
          lon: 0.4,
          tariffs: { 6: 10 },
        }),
        buildTollPoint({
          id: "sp-21-mismatch",
          road: "SP-21",
          roadNormalized: "SP-21",
          lat: 0.0001,
          lon: 0.6,
          tariffs: { 6: 20 },
        }),
      ],
    });

    expect(result.matches.map((match) => match.point.id)).toEqual(["sp-021-match"]);
    expect(result.total).toBe(10);
    expect(result.matches[0].matchedRouteRoads).toEqual(["SP-021"]);
  });
});
