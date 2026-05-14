import { describe, expect, it } from "vitest";
import { SPACE_TRUCK_TOLL_POINTS } from "@/lib/tollPoints";

describe("manual toll point coordinate overrides", () => {
  it("preserves zero-padded SP-021 normalization for Rodoanel coordinate overrides", () => {
    const raposoTavaresKm24Points = SPACE_TRUCK_TOLL_POINTS
      .filter((point) => (
        point.uf === "SP" &&
        point.roadNormalized === "SP-021" &&
        point.city === "Osasco" &&
        point.km === "24,000" &&
        point.name.toLowerCase().includes("raposo tavares")
      ))
      .map((point) => `${point.name}|${point.lat}|${point.lon}`)
      .sort();

    expect(raposoTavaresKm24Points).toEqual([
      "RAPOSO TAVARES EXTERNA|-23.5883227|-46.810068",
      "RAPOSO TAVARES INTERNA|-23.5940081|-46.8091097",
    ]);
  });
});
