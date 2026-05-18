import { describe, expect, it } from "vitest";
import { SPACE_TRUCK_TOLL_POINTS, VIUVA_GRACA_P04_CHARGE_GROUP_ID } from "@/lib/tollPoints";

const federalAnttPoints = SPACE_TRUCK_TOLL_POINTS.filter(
  (point) => point.regulator === "ANTT" && point.jurisdiction === "federal",
);

describe("ANTT federal toll synchronization", () => {
  it("expands official bidirectional federal toll rows into directional points", () => {
    expect(federalAnttPoints).toHaveLength(443);
  });

  it("does not keep generic bidirectional federal ANTT points at runtime", () => {
    expect(federalAnttPoints.some((point) => point.directionNormalized === "both")).toBe(false);
  });

  it("keeps the official directional balance from the ANTT source file", () => {
    const directionSummary = federalAnttPoints.reduce<Record<string, number>>((summary, point) => {
      summary[point.directionNormalized] = (summary[point.directionNormalized] || 0) + 1;
      return summary;
    }, {});

    expect(directionSummary).toEqual({
      increasing: 215,
      decreasing: 228,
    });
  });

  it("preserves Viúva Graça official ANTT points instead of collapsing them into one override", () => {
    const viuvaGracaPoints = federalAnttPoints.filter((point) =>
      point.roadNormalized === "BR-116" &&
      point.uf === "RJ" &&
      point.city === "Seropédica" &&
      point.name.toLowerCase().includes("viúva graça"),
    );

    expect(viuvaGracaPoints.map((point) => `${point.name}|${point.direction}|${point.lat}|${point.lon}`)).toEqual([
      "P04 Viúva Graça - Sentido Crescente|Crescente|-22.716277|-43.716858",
      "P04 Viúva Graça - Sentido Decrescente|Decrescente|-22.716277|-43.716858",
      "P05 Viúva Graça (B) - Sentido Crescente|Crescente|-22.715213|-43.730252",
      "P05 Viúva Graça (B) - Sentido Decrescente|Decrescente|-22.715213|-43.730252",
      "Viúva Graça Norte|Decrescente|-22.716155|-43.716697",
    ]);
  });

  it("groups only P04 and Viúva Graça Norte under the shared charge group id", () => {
    const viuvaGracaPoints = federalAnttPoints.filter((point) =>
      point.roadNormalized === "BR-116" &&
      point.uf === "RJ" &&
      point.city === "Seropédica" &&
      point.name.toLowerCase().includes("viúva graça"),
    );

    const p04AndNorth = viuvaGracaPoints.filter((point) =>
      point.name.includes("P04 Viúva Graça") || point.name.includes("Viúva Graça Norte"),
    );
    const p05 = viuvaGracaPoints.filter((point) => point.name.includes("P05 Viúva Graça (B)"));

    // P04 é expandido em Crescente/Decrescente, e Viúva Graça Norte é um ponto direcional separado.
    expect(p04AndNorth).toHaveLength(3);
    expect(p04AndNorth.every((point) => point.chargeGroupId === VIUVA_GRACA_P04_CHARGE_GROUP_ID)).toBe(true);
    expect(p05).toHaveLength(2);
    expect(p05.some((point) => point.chargeGroupId === VIUVA_GRACA_P04_CHARGE_GROUP_ID)).toBe(false);
  });
});
