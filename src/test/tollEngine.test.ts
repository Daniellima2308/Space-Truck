import { describe, expect, it } from "vitest";
import {
  calculateRouteToll,
  getDistanceFromRouteKm,
} from "@/lib/tollEngine";
import { SPACE_TRUCK_TOLL_BASE_SOURCE, type TollPoint } from "@/lib/tollPoints";

function buildTollPoint(
  overrides: Partial<TollPoint> & Pick<TollPoint, "id" | "lat" | "lon">,
): TollPoint {
  return {
    id: overrides.id,
    name: overrides.name ?? `Praça ${overrides.id}`,
    uf: overrides.uf ?? "SP",
    regulator: overrides.regulator ?? "ANTT",
    jurisdiction: overrides.jurisdiction ?? "federal",
    concessionaire: overrides.concessionaire ?? "Concessionária teste",
    road: overrides.road ?? "BR-000",
    km: overrides.km ?? "100",
    city: overrides.city ?? "Cidade teste",
    direction: overrides.direction ?? "ambos",
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
  };
}

const straightRoute = [
  { lat: 0, lon: 0 },
  { lat: 0, lon: 1 },
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
        buildTollPoint({ id: "toll-1", lat: 0.01, lon: 0.25, tariffs: { 6: 28.4 } }),
        buildTollPoint({ id: "toll-2", lat: -0.01, lon: 0.75, tariffs: { 6: 31.6 } }),
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
