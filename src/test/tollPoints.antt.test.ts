import { describe, expect, it } from "vitest";
import { SPACE_TRUCK_TOLL_POINTS } from "@/lib/tollPoints";

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
});
