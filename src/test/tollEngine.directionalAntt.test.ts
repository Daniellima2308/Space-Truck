import { describe, expect, it } from "vitest";
import { calculateRouteToll } from "@/lib/tollEngine";
import { VIUVA_GRACA_P04_CHARGE_GROUP_ID, type TollPoint } from "@/lib/tollPoints";

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

  it("dedupes overlapping matches with same chargeGroupId without assuming higher fare wins", () => {
    // O objetivo é garantir uma única cobrança por chargeGroupId; a escolha do ponto correto
    // deve vir do filtro direcional e da qualidade geométrica, não da maior tarifa.
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
          chargeGroupId: VIUVA_GRACA_P04_CHARGE_GROUP_ID,
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
          chargeGroupId: VIUVA_GRACA_P04_CHARGE_GROUP_ID,
          tariffs: { 6: 21.2 },
        }),
      ],
    });

    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].point.chargeGroupId).toBe(VIUVA_GRACA_P04_CHARGE_GROUP_ID);
    expect(result.total).toBe(result.matches[0].tollValue);
  });

  it("filters direction-incompatible duplicate before dedupe", () => {
    const result = calculateRouteToll({
      routePath: [{ lat: 0, lon: 0 }, { lat: 0, lon: 1 }],
      axles: 6,
      routeCorridorKm: 1,
      tollPoints: [
        buildFederalAnttPoint({ id: "anchor-1", lat: 0.0001, lon: 0.2, km: "10", kmNumber: 10, direction: "Crescente", directionNormalized: "increasing", tariffs: { 6: 1 } }),
        buildFederalAnttPoint({ id: "dup-compatible", lat: 0.0001, lon: 0.4, km: "20", kmNumber: 20, direction: "Crescente", directionNormalized: "increasing", chargeGroupId: "grp-a", tariffs: { 6: 10 } }),
        buildFederalAnttPoint({ id: "dup-incompatible", lat: 0.0001, lon: 0.40005, km: "20", kmNumber: 20, direction: "Decrescente", directionNormalized: "decreasing", chargeGroupId: "grp-a", tariffs: { 6: 50 } }),
        buildFederalAnttPoint({ id: "anchor-2", lat: 0.0001, lon: 0.6, km: "30", kmNumber: 30, direction: "Crescente", directionNormalized: "increasing", tariffs: { 6: 1 } }),
      ],
    });

    expect(result.matches.map((match) => match.point.id)).toEqual(["anchor-1", "dup-compatible", "anchor-2"]);
    expect(result.total).toBe(12);
  });

  it("dedupes physically overlapping points without explicit chargeGroupId", () => {
    const result = calculateRouteToll({
      routePath: [{ lat: 0, lon: 0 }, { lat: 0, lon: 1 }],
      axles: 6,
      routeCorridorKm: 1,
      tollPoints: [
        buildFederalAnttPoint({ id: "ov-a", name: "Pórtico Viúva Graça", lat: 0.00012, lon: 0.45956, km: "459,56", kmNumber: 459.56, city: "Seropédica", road: "BR-116", roadNormalized: "BR-116", direction: "Crescente", directionNormalized: "increasing", tariffs: { 6: 17 } }),
        buildFederalAnttPoint({ id: "ov-b", name: "Praça Viúva Graça Norte", lat: 0.00014, lon: 0.45957, km: "459,57", kmNumber: 459.57, city: "Seropédica", road: "BR-116", roadNormalized: "BR-116", direction: "Crescente", directionNormalized: "increasing", tariffs: { 6: 17 } }),
      ],
    });

    expect(result.matches).toHaveLength(1);
  });

  it("does not collapse distinct tolls with different km and route position", () => {
    const result = calculateRouteToll({
      routePath: [{ lat: 0, lon: 0 }, { lat: 0, lon: 1 }],
      axles: 6,
      routeCorridorKm: 1,
      tollPoints: [
        buildFederalAnttPoint({ id: "p04", name: "P04 Viúva Graça - Sentido Crescente", lat: 0.0001, lon: 0.45956, km: "459,56", kmNumber: 459.56, city: "Seropédica", road: "BR-116", direction: "Crescente", directionNormalized: "increasing", tariffs: { 6: 19.4 } }),
        buildFederalAnttPoint({ id: "p05", name: "P05 Viúva Graça (B) - Sentido Crescente", lat: 0.0001, lon: 0.73025, km: "473,00", kmNumber: 473, city: "Seropédica", road: "BR-116", direction: "Crescente", directionNormalized: "increasing", tariffs: { 6: 21.2 } }),
      ],
    });
    expect(result.matches).toHaveLength(2);
  });
});
