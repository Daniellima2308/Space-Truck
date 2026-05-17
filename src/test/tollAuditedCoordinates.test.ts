import { describe, expect, it } from "vitest";
import { SPACE_TRUCK_TOLL_POINTS } from "@/lib/tollPoints";

const findById = (id: string) => SPACE_TRUCK_TOLL_POINTS.find((p) => p.id === id);

describe("toll audited coordinates", () => {
  it("aplica coordenadas auditadas de Castello e BR-116", () => {
    expect(SPACE_TRUCK_TOLL_POINTS.some((p) => p.lat === -23.507804 && p.lon === -46.822332)).toBe(true);
    expect(SPACE_TRUCK_TOLL_POINTS.some((p) => p.lat === -23.51789087 && p.lon === -46.81385366)).toBe(true);
    expect(findById("br_antt_153_riosp_aruja_rodoanel")).toMatchObject({ lat: -23.413256, lon: -46.360903 });
    expect(findById("br_antt_150_riosp_guararema")).toMatchObject({ lat: -23.346577, lon: -46.164833 });
    expect(findById("br_antt_180_riosp_guararema")).toMatchObject({ lat: -23.338755, lon: -46.150288 });
    expect(findById("br_antt_213_riosp_jacarei")).toMatchObject({ lat: -23.296471, lon: -46.007414 });
    expect(findById("br_antt_214_riosp_jacarei")).toMatchObject({ lat: -23.296471, lon: -46.007414 });
    expect(findById("br_antt_158_riosp_itatiaia")).toMatchObject({ lat: -22.494961, lon: -44.569561, chargeGroupId: "br116-itatiaia-riosp" });
    expect(findById("br_antt_159_riosp_itatiaia")).toMatchObject({ lat: -22.494961, lon: -44.569561, chargeGroupId: "br116-itatiaia-riosp" });
  });

  it("diferencia Guararema SP-070 por sentido", () => {
    const leste = findById("sp_artesp_174_l23_paulista_guararema_");
    const oeste = findById("sp_artesp_175_l23_paulista_guararema_");
    expect(leste).toMatchObject({ lat: -23.384088, lon: -46.153959 });
    expect(oeste).toMatchObject({ lat: -23.38431, lon: -46.153816 });
  });

  it("expõe pontos manuais de Barueri com corredor e grupo", () => {
    const manualBarueri = SPACE_TRUCK_TOLL_POINTS.filter((p) => p.chargeGroupId === "sp021-barueri-praca");
    expect(manualBarueri).toHaveLength(2);
    expect(manualBarueri.every((p) => p.routeCorridorKm === 0.015)).toBe(true);
  });
});
