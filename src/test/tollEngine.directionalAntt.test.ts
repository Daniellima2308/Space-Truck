import { describe, expect, it } from "vitest";
import { calculateRouteToll } from "@/lib/tollEngine";
import type { TollPoint } from "@/lib/tollPoints";

function buildFederalAnttPoint(overrides: Partial<TollPoint> & Pick<TollPoint, "id" | "lat" | "lon" | "km" | "kmNumber" | "direction" | "directionNormalized" | "tariffs">): TollPoint {
  return {
    id: overrides.id,
    name: overrides.name ?? "Praça ANTT teste",
    uf: overrides.uf ?? "RJ",
    regulator: "ANTT",
    jurisdiction: "federal",
    concessionaire: overrides.concessionaire ?? "Concessionária ANTT teste",
    road: overrides.road ?? "BR-116",
    roadNormalized: overrides.roadNormalized ?? "BR-116",
    km: overrides.km,
    kmNumber: overrides.kmNumber,
    city: overrides.city ?? "Cidade teste",
    direction: overrides.direction,
    directionNormalized: overrides.directionNormalized,
    lat: overrides.lat,
    lon: overrides.lon,
    tariffs: overrides.tariffs,
    geoConfidence: overrides.geoConfidence ?? "alta",
    valueConfidence: overrides.valueConfidence ?? "alta",
    coordinateRole: overrides.coordinateRole ?? "directional_plaza",
    expectedHeadingDegrees: overrides.expectedHeadingDegrees ?? null,
    headingToleranceDegrees: overrides.headingToleranceDegrees ?? null,
  };
}

describe("ANTT directional toll detection", () => {
  it("does not double charge split ANTT directions that share the same coordinates", () => {
    const result = calculateRouteToll({
      routePath: [
        { lat: 0, lon: 0 },
        { lat: 0, lon: 1 },
      ],
      axles: 6,
      routeCorridorKm: 1,
      tollPoints: [
        buildFederalAnttPoint({
          id: "anchor-increasing-start",
          lat: 0.0001,
          lon: 0.2,
          km: "10",
          kmNumber: 10,
          direction: "Crescente",
          directionNormalized: "increasing",
          tariffs: { 6: 1 },
        }),
        buildFederalAnttPoint({
          id: "split-direction-increasing",
          lat: 0.0001,
          lon: 0.4,
          km: "20",
          kmNumber: 20,
          direction: "Crescente",
          directionNormalized: "increasing",
          tariffs: { 6: 10 },
        }),
        buildFederalAnttPoint({
          id: "split-direction-decreasing",
          lat: 0.0001,
          lon: 0.4,
          km: "20",
          kmNumber: 20,
          direction: "Decrescente",
          directionNormalized: "decreasing",
          tariffs: { 6: 10 },
        }),
        buildFederalAnttPoint({
          id: "anchor-increasing-end",
          lat: 0.0001,
          lon: 0.6,
          km: "30",
          kmNumber: 30,
          direction: "Crescente",
          directionNormalized: "increasing",
          tariffs: { 6: 1 },
        }),
      ],
    });

    expect(result.matches.map((match) => match.point.id)).toEqual([
      "anchor-increasing-start",
      "split-direction-increasing",
      "anchor-increasing-end",
    ]);
    expect(result.total).toBe(12);
  });
});
