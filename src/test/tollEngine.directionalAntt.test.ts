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
    routeCorridorKm: overrides.routeCorridorKm,
    chargeGroupId: overrides.chargeGroupId,
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

  it("dedupes overlapping Viúva Graça matches when they share the same charge group", () => {
    const result = calculateRouteToll({
      routePath: [
        { lat: 0, lon: 0 },
        { lat: 0, lon: 1 },
      ],
      axles: 6,
      routeCorridorKm: 1,
      tollPoints: [
        buildFederalAnttPoint({
          id: "p04-viuva-graca-crescente",
          name: "P04 Viúva Graça - Sentido Crescente",
          lat: 0.0001,
          lon: 0.45956,
          km: "459,56",
          kmNumber: 459.56,
          direction: "Crescente",
          directionNormalized: "increasing",
          chargeGroupId: "br116-viuva-graca-p04-seropedica",
          tariffs: { 6: 19.4 },
        }),
        buildFederalAnttPoint({
          id: "viuva-graca-norte",
          name: "Viúva Graça Norte",
          lat: 0.0002,
          lon: 0.45957,
          km: "459,57",
          kmNumber: 459.57,
          direction: "Decrescente",
          directionNormalized: "decreasing",
          chargeGroupId: "br116-viuva-graca-p04-seropedica",
          tariffs: { 6: 21.2 },
        }),
      ],
    });

    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].point.chargeGroupId).toBe("br116-viuva-graca-p04-seropedica");
    expect(result.matches[0].point.id).toBe("viuva-graca-norte");
    expect(result.total).toBe(21.2);
  });
});
