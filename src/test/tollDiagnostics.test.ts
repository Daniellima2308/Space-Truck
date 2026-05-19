import { describe, expect, it } from "vitest";
import { getRouteTollDiagnostics } from "@/lib/tollDiagnostics";
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
    routeCorridorKm: overrides.routeCorridorKm,
  };
}

describe("tollDiagnostics", () => {
  it("não marca como fora do corredor uma praça dentro da tolerância de borda", () => {
    const diagnostics = getRouteTollDiagnostics({
      routePath: straightRoute,
      axles: 6,
      tollPoints: [
        buildTollPoint({
          id: "edge-default",
          name: "Pedágio na borda",
          lat: 0.00049,
          lon: 0.5,
          direction: "ambos",
          directionNormalized: "both",
          road: "BR-000",
          roadNormalized: "BR-000",
        }),
      ],
    });

    expect(diagnostics).toHaveLength(0);
  });

  it("explica quando um PFE da BR-116 fica fora do corredor específico de 20 metros", () => {
    const diagnostics = getRouteTollDiagnostics({
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

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({
      reason: "outside_route_corridor",
      routeCorridorKm: 0.025,
    });
    expect(diagnostics[0].distanceFromRouteKm).toBeGreaterThan(0.025);
    expect(diagnostics[0].distanceFromRouteKm).toBeLessThan(0.05);
  });

  it("explica quando uma praça próxima pertence a outra rodovia", () => {
    const diagnostics = getRouteTollDiagnostics({
      routePath: straightRoute,
      axles: 6,
      routeSegments: [
        {
          startPointIndex: 0,
          endPointIndex: 1,
          roadNames: ["BR-116"],
          roadNumbers: ["BR-116"],
          roadNumbersNormalized: ["BR-116"],
          source: "importantRoadStretch",
        },
      ],
      tollPoints: [
        buildTollPoint({
          id: "parallel-road-toll",
          name: "Pedágio paralelo",
          road: "SP-055",
          roadNormalized: "SP-055",
          lat: 0.0001,
          lon: 0.5,
        }),
      ],
    });

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({
      reason: "route_road_mismatch",
      matchedRouteRoads: ["BR-116"],
    });
  });
});
