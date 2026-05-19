import { describe, expect, it } from "vitest";
import type { RouteSegment } from "@/lib/routeApi";
import {
  calculateRouteToll,
  getDistanceFromRouteKm,
} from "@/lib/tollEngine";
import { SPACE_TRUCK_TOLL_BASE_SOURCE, type TollPoint } from "@/lib/tollPoints";

function normalizeRoadForTest(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = value.toUpperCase().match(/\b([A-Z]{2})[-\s]?(\d{2,3})\b/);
  return match ? `${match[1]}-${match[2]}` : value.toUpperCase();
}

function parseKmForTest(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value.replace(",", ".").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeDirectionForTest(value: string | null | undefined): TollPoint["directionNormalized"] {
  const normalized = (value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (normalized.includes("crescente") && normalized.includes("decrescente")) return "both";
  if (normalized.includes("ambos")) return "both";
  if (normalized.includes("crescente")) return "increasing";
  if (normalized.includes("decrescente")) return "decreasing";
  return "unknown";
}

function buildTollPoint(
  overrides: Partial<TollPoint> & Pick<TollPoint, "id" | "lat" | "lon">,
): TollPoint {
  const road = overrides.road ?? "BR-000";
  const km = overrides.km ?? "100";
  const direction = overrides.direction ?? "ambos";

  return {
    id: overrides.id,
    name: overrides.name ?? `Praça ${overrides.id}`,
    uf: overrides.uf ?? "SP",
    regulator: overrides.regulator ?? "ANTT",
    jurisdiction: overrides.jurisdiction ?? "federal",
    concessionaire: overrides.concessionaire ?? "Concessionária teste",
    road,
    roadNormalized: overrides.roadNormalized ?? normalizeRoadForTest(road),
    km,
    kmNumber: overrides.kmNumber ?? parseKmForTest(km),
    city: overrides.city ?? "Cidade teste",
    direction,
    directionNormalized: overrides.directionNormalized ?? normalizeDirectionForTest(direction),
    lat: overrides.lat,
    lon: overrides.lon,
    tariffs: overrides.tariffs ?? {
      2: 10,
      3: 15,
      6: 30,
      9: 45,
    },
    geoConfidence: overrides.geoConfidence ?? "alta",
    valueConfidence: overrides.valueConfidence ?? "alta",
    routeCorridorKm: overrides.routeCorridorKm,
    chargeGroupId: overrides.chargeGroupId,
  };
}

const straightRoute = [
  { lat: 0, lon: 0 },
  { lat: 0, lon: 1 },
];

const br116RouteSegments: RouteSegment[] = [
  {
    startPointIndex: 0,
    endPointIndex: 1,
    roadNames: ["BR-116"],
    roadNumbers: ["BR-116"],
    roadNumbersNormalized: ["BR-116"],
    source: "importantRoadStretch",
  },
];

describe("tollEngine", () => {
  it("calcula a distância de um ponto até a polyline da rota", () => {
    const distanceKm = getDistanceFromRouteKm(
      { lat: 0.01, lon: 0.5 },
      straightRoute,
    );

    expect(distanceKm).toBeGreaterThan(1);
    expect(distanceKm).toBeLessThan(1.2);
  });

  it("retorna geometria insuficiente quando a rota não tem polyline mínima", () => {
    const result = calculateRouteToll({
      routePath: [{ lat: 0, lon: 0 }],
      axles: 6,
      tollPoints: [buildTollPoint({ id: "toll-1", lat: 0, lon: 0 })],
    });

    expect(result.total).toBe(0);
    expect(result.source).toBe("insufficient_route_geometry");
    expect(result.matches).toHaveLength(0);
  });

  it("retorna geometria insuficiente quando a rota fica curta após remover coordenadas inválidas", () => {
    const result = calculateRouteToll({
      routePath: [
        { lat: 0, lon: 0 },
        { lat: 91, lon: 0 },
      ],
      axles: 6,
      tollPoints: [buildTollPoint({ id: "toll-1", lat: 0, lon: 0 })],
    });

    expect(result.total).toBe(0);
    expect(result.source).toBe("insufficient_route_geometry");
    expect(result.matches).toHaveLength(0);
  });

  it("retorna geometria insuficiente quando o número de eixos não é suportado", () => {
    const result = calculateRouteToll({
      routePath: straightRoute,
      axles: 10,
      tollPoints: [buildTollPoint({ id: "toll-1", lat: 0, lon: 0.5 })],
    });

    expect(result.total).toBe(0);
    expect(result.source).toBe("insufficient_route_geometry");
  });

  it("soma praças dentro do corredor da rota usando a tarifa do eixo informado", () => {
    const result = calculateRouteToll({
      routePath: straightRoute,
      axles: 6,
      tollPoints: [
        buildTollPoint({ id: "toll-1", lat: 0.01, lon: 0.25, km: "100", tariffs: { 6: 28.4 } }),
        buildTollPoint({ id: "toll-2", lat: -0.01, lon: 0.75, km: "200", tariffs: { 6: 31.6 } }),
      ],
      routeCorridorKm: 2.5,
    });

    expect(result.source).toBe(SPACE_TRUCK_TOLL_BASE_SOURCE);
    expect(result.total).toBe(60);
    expect(result.matches.map((match) => match.point.id)).toEqual([
      "toll-1",
      "toll-2",
    ]);
  });

  it("ordena pedágios pela sequência da viagem e informa posição na rota", () => {
    const result = calculateRouteToll({
      routePath: straightRoute,
      axles: 6,
      tollPoints: [
        buildTollPoint({ id: "third", lat: 0.01, lon: 0.75, km: "300", tariffs: { 6: 10 } }),
        buildTollPoint({ id: "first", lat: 0.01, lon: 0.25, km: "100", tariffs: { 6: 10 } }),
        buildTollPoint({ id: "second", lat: 0.01, lon: 0.5, km: "200", tariffs: { 6: 10 } }),
      ],
      routeCorridorKm: 2.5,
    });

    expect(result.matches.map((match) => match.point.id)).toEqual([
      "first",
      "second",
      "third",
    ]);
    expect(result.matches.map((match) => match.routeOrder)).toEqual([1, 2, 3]);
    expect(result.matches[0].distanceAlongRouteKm).toBeLessThan(result.matches[1].distanceAlongRouteKm);
    expect(result.matches[1].distanceAlongRouteKm).toBeLessThan(result.matches[2].distanceAlongRouteKm);
  });

  it("aceita praça quando a rodovia do segmento real da rota é compatível", () => {
    const result = calculateRouteToll({
      routePath: straightRoute,
      routeSegments: br116RouteSegments,
      axles: 6,
      tollPoints: [
        buildTollPoint({
          id: "br116-toll",
          lat: 0.0001,
          lon: 0.5,
          road: "BR-116",
          km: "120",
          tariffs: { 6: 42 },
        }),
      ],
      routeCorridorKm: 2.5,
    });

    expect(result.total).toBe(42);
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].matchedRouteRoads).toEqual(["BR-116"]);
  });

  it("rejeita praça próxima quando ela pertence a rodovia diferente do segmento da rota", () => {
    const result = calculateRouteToll({
      routePath: straightRoute,
      routeSegments: br116RouteSegments,
      axles: 6,
      tollPoints: [
        buildTollPoint({
          id: "parallel-road-toll",
          lat: 0.0001,
          lon: 0.5,
          road: "SP-055",
          km: "120",
          tariffs: { 6: 42 },
        }),
      ],
      routeCorridorKm: 2.5,
    });

    expect(result.total).toBe(0);
    expect(result.source).toBe("no_toll_points_found");
    expect(result.matches).toHaveLength(0);
  });

  it("mantém o comportamento antigo quando a rota não tem metadados de rodovia", () => {
    const result = calculateRouteToll({
      routePath: straightRoute,
      routeSegments: [],
      axles: 6,
      tollPoints: [
        buildTollPoint({
          id: "metadata-missing-toll",
          lat: 0.0001,
          lon: 0.5,
          road: "SP-055",
          km: "120",
          tariffs: { 6: 42 },
        }),
      ],
      routeCorridorKm: 2.5,
    });

    expect(result.total).toBe(42);
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].matchedRouteRoads).toEqual([]);
  });

  it("deduplica registros equivalentes da mesma praça física", () => {
    const result = calculateRouteToll({
      routePath: straightRoute,
      axles: 6,
      tollPoints: [
        buildTollPoint({
          id: "same-place-a",
          lat: 0.01,
          lon: 0.5,
          road: "BR-000",
          km: "100",
          city: "Cidade teste",
          concessionaire: "Concessionária teste",
          tariffs: { 6: 30 },
        }),
        buildTollPoint({
          id: "same-place-b",
          lat: 0.01,
          lon: 0.5,
          road: "BR-000",
          km: "100",
          city: "Cidade teste",
          concessionaire: "Concessionária teste",
          tariffs: { 6: 30 },
        }),
      ],
      routeCorridorKm: 2.5,
    });

    expect(result.total).toBe(30);
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].routeOrder).toBe(1);
  });

  it("deduplica por chargeGroupId mantendo maior tarifa e depois menor distância", () => {
    const result = calculateRouteToll({
      routePath: straightRoute,
      axles: 6,
      tollPoints: [
        buildTollPoint({ id: "group-a", lat: 0.0002, lon: 0.25, tariffs: { 6: 20 }, chargeGroupId: "grp-1" }),
        buildTollPoint({ id: "group-b", lat: 0.0001, lon: 0.26, tariffs: { 6: 30 }, chargeGroupId: "grp-1" }),
        buildTollPoint({ id: "group-c", lat: 0.00005, lon: 0.27, tariffs: { 6: 30 }, chargeGroupId: "grp-1" }),
      ],
      routeCorridorKm: 2.5,
    });

    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].point.id).toBe("group-b");
    expect(result.total).toBe(30);
  });

  it("respeita corredor específico do ponto quando routeCorridorKm está definido", () => {
    const result = calculateRouteToll({
      routePath: straightRoute,
      axles: 6,
      tollPoints: [
        buildTollPoint({
          id: "manual-corridor",
          lat: 0.00025,
          lon: 0.5,
          tariffs: { 6: 10 },
          routeCorridorKm: 0.015,
        }),
      ],
    });

    expect(result.matches).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it("usa o corredor específico do ponto quando o corredor global é maior", () => {
    const result = calculateRouteToll({
      routePath: straightRoute,
      axles: 6,
      routeCorridorKm: 2,
      tollPoints: [
        buildTollPoint({
          id: "manual-corridor-match",
          lat: 0.0001,
          lon: 0.25,
          tariffs: { 6: 10 },
          routeCorridorKm: 0.5,
        }),
      ],
    });

    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].point.id).toBe("manual-corridor-match");
    expect(result.total).toBe(10);
  });

  it("não deduplica praças distintas só por estarem próximas na mesma rodovia", () => {
    const result = calculateRouteToll({
      routePath: straightRoute,
      axles: 6,
      tollPoints: [
        buildTollPoint({
          id: "distinct-a",
          name: "Praça distinta A",
          lat: 0.0001,
          lon: 0.3,
          road: "BR-101",
          km: "100",
          city: "Cidade A",
          concessionaire: "Concessionária A",
          tariffs: { 6: 10 },
        }),
        buildTollPoint({
          id: "distinct-b",
          name: "Praça distinta B",
          lat: 0.0001,
          lon: 0.3015,
          road: "BR-101",
          km: "101",
          city: "Cidade A",
          concessionaire: "Concessionária A",
          tariffs: { 6: 20 },
        }),
      ],
      routeCorridorKm: 2.5,
    });

    expect(result.total).toBe(30);
    expect(result.matches.map((match) => match.point.id)).toEqual([
      "distinct-a",
      "distinct-b",
    ]);
  });

  it("deduplica praças próximas quando a identidade física forte é a mesma", () => {
    const result = calculateRouteToll({
      routePath: straightRoute,
      axles: 6,
      tollPoints: [
        buildTollPoint({
          id: "duplicate-low",
          name: "Praça Principal",
          lat: 0.0001,
          lon: 0.4,
          road: "BR-116",
          km: "200",
          city: "Cidade B",
          concessionaire: "Concessionária B",
          tariffs: { 6: 10 },
        }),
        buildTollPoint({
          id: "duplicate-high",
          name: "Praça Principal",
          lat: 0.0001,
          lon: 0.401,
          road: "BR-116",
          km: "200",
          city: "Cidade B",
          concessionaire: "Concessionária B",
          tariffs: { 6: 20 },
        }),
      ],
      routeCorridorKm: 2.5,
    });

    expect(result.total).toBe(20);
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].point.id).toBe("duplicate-high");
  });

  it("em empate de valor, deduplica escolhendo o registro mais próximo da rota", () => {
    const result = calculateRouteToll({
      routePath: straightRoute,
      axles: 6,
      tollPoints: [
        buildTollPoint({
          id: "duplicate-farther",
          name: "Praça Empate",
          lat: 0.01,
          lon: 0.6,
          road: "BR-386",
          km: "300",
          city: "Cidade C",
          concessionaire: "Concessionária C",
          tariffs: { 6: 20 },
        }),
        buildTollPoint({
          id: "duplicate-closer",
          name: "Praça Empate",
          lat: 0.001,
          lon: 0.6005,
          road: "BR-386",
          km: "300",
          city: "Cidade C",
          concessionaire: "Concessionária C",
          tariffs: { 6: 20 },
        }),
      ],
      routeCorridorKm: 2.5,
    });

    expect(result.total).toBe(20);
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].point.id).toBe("duplicate-closer");
  });

  it("usa tolerância de 5 metros para evitar falso negativo na borda do corredor padrão", () => {
    const result = calculateRouteToll({
      routePath: straightRoute,
      axles: 6,
      tollPoints: [
        buildTollPoint({ id: "edge-default", lat: 0.00049, lon: 0.4, tariffs: { 6: 10 } }),
      ],
    });

    expect(result.routeCorridorKm).toBe(0.05);
    expect(result.matches.map((match) => match.point.id)).toEqual(["edge-default"]);
    expect(result.total).toBe(10);
  });

  it("mantém fora pontos claramente acima da tolerância de borda do corredor padrão", () => {
    const result = calculateRouteToll({
      routePath: straightRoute,
      axles: 6,
      tollPoints: [
        buildTollPoint({ id: "outside-edge-default", lat: 0.00065, lon: 0.4, tariffs: { 6: 10 } }),
      ],
    });

    expect(result.routeCorridorKm).toBe(0.05);
    expect(result.matches).toHaveLength(0);
    expect(result.total).toBe(0);
    expect(result.source).toBe("no_toll_points_found");
  });

  it("usa corredor padrão de 50 metros quando nenhum corredor é informado", () => {
    const result = calculateRouteToll({
      routePath: straightRoute,
      axles: 6,
      tollPoints: [
        buildTollPoint({ id: "inside-default", lat: 0.0004, lon: 0.4, tariffs: { 6: 10 } }),
        buildTollPoint({ id: "outside-default", lat: 0.0006, lon: 0.6, tariffs: { 6: 20 } }),
      ],
    });

    expect(result.routeCorridorKm).toBe(0.05);
    expect(result.total).toBe(10);
    expect(result.matches.map((match) => match.point.id)).toEqual(["inside-default"]);
  });

  it("mantém fora da rota pontos acima do corredor padrão de 50 metros", () => {
    const result = calculateRouteToll({
      routePath: straightRoute,
      axles: 6,
      tollPoints: [
        buildTollPoint({ id: "outside-default", lat: 0.0006, lon: 0.6, tariffs: { 6: 20 } }),
      ],
    });

    expect(result.routeCorridorKm).toBe(0.05);
    expect(result.total).toBe(0);
    expect(result.source).toBe("no_toll_points_found");
    expect(result.matches).toHaveLength(0);
  });

  it("ignora praças fora do corredor da rota", () => {
    const result = calculateRouteToll({
      routePath: straightRoute,
      axles: 3,
      tollPoints: [
        buildTollPoint({ id: "near", lat: 0.01, lon: 0.5, tariffs: { 3: 12 } }),
        buildTollPoint({ id: "far", lat: 0.2, lon: 0.5, tariffs: { 3: 99 } }),
      ],
      routeCorridorKm: 2.5,
    });

    expect(result.total).toBe(12);
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].point.id).toBe("near");
  });

  it("retorna no_toll_points_found quando nenhuma praça bate com a rota", () => {
    const result = calculateRouteToll({
      routePath: straightRoute,
      axles: 6,
      tollPoints: [buildTollPoint({ id: "far", lat: 0.2, lon: 0.5, tariffs: { 6: 30 } })],
      routeCorridorKm: 2.5,
    });

    expect(result.total).toBe(0);
    expect(result.source).toBe("no_toll_points_found");
    expect(result.matches).toHaveLength(0);
  });

  it("ignora praça sem tarifa válida para o eixo escolhido", () => {
    const result = calculateRouteToll({
      routePath: straightRoute,
      axles: 9,
      tollPoints: [buildTollPoint({ id: "without-9-axles", lat: 0.01, lon: 0.5, tariffs: { 6: 30 } })],
      routeCorridorKm: 2.5,
    });

    expect(result.total).toBe(0);
    expect(result.source).toBe("no_toll_points_found");
  });
});
