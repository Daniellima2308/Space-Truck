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

  it("usa corredor padrão de 80 metros quando nenhum corredor é informado", () => {
    const result = calculateRouteToll({
      routePath: straightRoute,
      axles: 6,
      tollPoints: [
        buildTollPoint({ id: "inside-default", lat: 0.0005, lon: 0.4, tariffs: { 6: 10 } }),
        buildTollPoint({ id: "outside-default", lat: 0.001, lon: 0.6, tariffs: { 6: 20 } }),
      ],
    });

    expect(result.routeCorridorKm).toBe(0.08);
    expect(result.total).toBe(10);
    expect(result.matches.map((match) => match.point.id)).toEqual(["inside-default"]);
  });

  it("mantém fora da rota pontos acima do corredor padrão de 80 metros", () => {
    const result = calculateRouteToll({
      routePath: straightRoute,
      axles: 6,
      tollPoints: [
        buildTollPoint({ id: "outside-default", lat: 0.001, lon: 0.6, tariffs: { 6: 20 } }),
      ],
    });

    expect(result.routeCorridorKm).toBe(0.08);
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
