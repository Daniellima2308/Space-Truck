import { describe, expect, it } from "vitest";
import { calculateRouteToll } from "@/lib/tollEngine";
import type { TollPoint } from "@/lib/tollPoints";

const straightRoute = [
  { lat: 0, lon: 0 },
  { lat: 0, lon: 1 },
];

function buildTollPoint(overrides: Partial<TollPoint> & Pick<TollPoint, "id" | "name" | "lat" | "lon">): TollPoint {
  return {
    id: overrides.id,
    name: overrides.name,
    uf: overrides.uf ?? "SP",
    regulator: overrides.regulator ?? "ANTT",
    jurisdiction: overrides.jurisdiction ?? "federal",
    concessionaire: overrides.concessionaire ?? "RIOSP",
    road: overrides.road ?? "BR-116",
    roadNormalized: overrides.roadNormalized ?? "BR-116",
    km: overrides.km ?? "210.2",
    kmNumber: overrides.kmNumber ?? 210.2,
    city: overrides.city ?? "Guarulhos",
    direction: overrides.direction ?? "Decrescente",
    directionNormalized: overrides.directionNormalized ?? "decreasing",
    lat: overrides.lat,
    lon: overrides.lon,
    tariffs: overrides.tariffs ?? { 6: 81 },
    geoConfidence: overrides.geoConfidence ?? "alta",
    valueConfidence: overrides.valueConfidence ?? "alta",
    coordinateRole: overrides.coordinateRole ?? "directional_gantry",
    expectedHeadingDegrees: overrides.expectedHeadingDegrees ?? null,
    headingToleranceDegrees: overrides.headingToleranceDegrees ?? null,
  };
}

describe("BR-116 PFE corridor", () => {
  it("usa corredor específico de 20 metros para pórticos PFE da BR-116", () => {
    const result = calculateRouteToll({
      routePath: straightRoute,
      axles: 6,
      tollPoints: [
        buildTollPoint({
          id: "pfe-outside-20m",
          name: "Free Flow PFE009 - BAIRRO Norte",
          lat: 0.00025,
          lon: 0.5,
        }),
      ],
    });

    expect(result.routeCorridorKm).toBe(0.05);
    expect(result.total).toBe(0);
    expect(result.source).toBe("no_toll_points_found");
    expect(result.matches).toHaveLength(0);
  });

  it("não aplica corredor de 20 metros para praça comum da BR-116", () => {
    const result = calculateRouteToll({
      routePath: straightRoute,
      axles: 6,
      tollPoints: [
        buildTollPoint({
          id: "regular-br116-inside-50m",
          name: "Itatiaia Norte",
          lat: 0.00025,
          lon: 0.5,
        }),
      ],
    });

    expect(result.total).toBe(81);
    expect(result.matches.map((match) => match.point.id)).toEqual(["regular-br116-inside-50m"]);
  });

  it("mantém PFE da BR-116 quando está dentro de 20 metros", () => {
    const result = calculateRouteToll({
      routePath: straightRoute,
      axles: 6,
      tollPoints: [
        buildTollPoint({
          id: "pfe-inside-20m",
          name: "Free Flow PFE009 - BAIRRO Norte",
          lat: 0.0001,
          lon: 0.5,
        }),
      ],
    });

    expect(result.total).toBe(81);
    expect(result.matches.map((match) => match.point.id)).toEqual(["pfe-inside-20m"]);
  });
});
