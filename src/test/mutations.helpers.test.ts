import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  round2,
  getTripMaxRealKm,
  getTripStartKm,
  getTripPendingPlannedFreights,
  buildRouteFailureDetails,
  buildOfflineSyncRouteToast,
  getFreightCreationFeedback,
  getVehicleCurrentKmFromSources,
  showActionSuccess,
  showActionError,
  showActionNotice,
  showOfflineSaved,
  showWarnings,
  ensureMutation,
  getTripVehicleId,
} from "@/context/mutations/helpers";

const toastMock = vi.hoisted(() => vi.fn());
vi.mock("@/hooks/use-toast", () => ({
  toast: toastMock,
}));

const supabaseMock = vi.hoisted(() => {
  const chainBuilder = {
    select: vi.fn(() => chainBuilder),
    eq: vi.fn(() => chainBuilder),
    maybeSingle: vi.fn(async () => ({ data: null, error: null })),
    single: vi.fn(async () => ({ data: null, error: null })),
    insert: vi.fn(async () => ({ data: null, error: null })),
    update: vi.fn(() => chainBuilder),
    delete: vi.fn(() => chainBuilder),
    in: vi.fn(() => chainBuilder),
    order: vi.fn(() => chainBuilder),
    limit: vi.fn(() => chainBuilder),
    then: (resolve: (v: unknown) => unknown) =>
      Promise.resolve({ data: [], error: null }).then(resolve),
  };
  return { from: vi.fn(() => chainBuilder), chainBuilder };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: supabaseMock.from },
}));

vi.mock("@/lib/fieldValidation", () => ({
  getKmBounds: vi.fn((kms: unknown) => kms),
}));

vi.mock("@/lib/fueling", () => ({
  buildFuelingFinancialPlan: vi.fn(() => []),
  buildTripStartKmMap: vi.fn(() => ({})),
  calculateFuelingPricePerLiter: vi.fn(() => 0),
  getFuelingOriginalTotalValue: vi.fn((x: { totalValue: number }) => x.totalValue),
}));

vi.mock("@/lib/mappers", () => ({
  mapFreightRow: vi.fn((x: unknown) => x),
}));

vi.mock("@/lib/freightStatus", () => ({
  normalizeTripFreights: vi.fn((x: unknown) => x),
}));

import type { Trip, FreightStatus, TripStatus } from "@/types";

const makeTrip = (overrides: Partial<Trip> = {}): Trip => ({
  id: "t1",
  vehicleId: "v1",
  status: "open" as TripStatus,
  freights: [],
  fuelings: [],
  expenses: [],
  personalExpenses: [],
  createdAt: "2026-01-01",
  finishedAt: undefined,
  estimatedDistance: 0,
  ...overrides,
});

const makeFueling = (kmCurrent: number) => ({
  id: `f-${kmCurrent}`,
  tripId: "t1",
  stationName: "Posto",
  totalValue: 100,
  liters: 20,
  pricePerLiter: 5,
  kmCurrent,
  average: 5,
  fullTank: true,
  date: "2026-01-01",
});

const makeFreight = (kmInitial: number, status: FreightStatus) => ({
  id: `fr-${kmInitial}`,
  tripId: "t1",
  origin: "A",
  destination: "B",
  kmInitial,
  grossValue: 1000,
  commissionPercent: 10,
  commissionValue: 100,
  status,
  estimatedDistance: 200,
  createdAt: "2026-01-01",
});

describe("round2", () => {
  it("rounds 1.125 to 1.13", () => expect(round2(1.125)).toBe(1.13));
  it("returns 0 for 0", () => expect(round2(0)).toBe(0));
  it("rounds 1.234567 to 1.23", () => expect(round2(1.234567)).toBe(1.23));
});

describe("getTripMaxRealKm", () => {
  it("returns vehicleCurrentKm when trip is undefined", () => {
    expect(getTripMaxRealKm(undefined, 300)).toBe(300);
  });

  it("returns vehicleCurrentKm when trip has no fuelings or freights", () => {
    expect(getTripMaxRealKm(makeTrip(), 300)).toBe(300);
  });

  it("returns fueling km when fueling km 500 > vehicle 300", () => {
    const trip = makeTrip({ fuelings: [makeFueling(500)] });
    expect(getTripMaxRealKm(trip, 300)).toBe(500);
  });

  it("returns completed freight km 800 when it is the max", () => {
    const trip = makeTrip({
      freights: [makeFreight(800, "completed")],
      fuelings: [makeFueling(300)],
    });
    expect(getTripMaxRealKm(trip, 100)).toBe(800);
  });

  it("ignores planned freights for max calculation", () => {
    const trip = makeTrip({
      freights: [makeFreight(900, "planned")],
      fuelings: [makeFueling(400)],
    });
    expect(getTripMaxRealKm(trip, 100)).toBe(400);
  });
});

describe("getTripStartKm", () => {
  it("returns null for undefined trip", () => {
    expect(getTripStartKm(undefined)).toBeNull();
  });

  it("returns null for trip with no checkpoints", () => {
    expect(getTripStartKm(makeTrip())).toBeNull();
  });

  it("returns min of fueling km 200 and freight km 300", () => {
    const trip = makeTrip({
      fuelings: [makeFueling(200)],
      freights: [makeFreight(300, "in_progress")],
    });
    expect(getTripStartKm(trip)).toBe(200);
  });

  it("includes km=0 as valid checkpoint", () => {
    const trip = makeTrip({
      fuelings: [makeFueling(0)],
    });
    expect(getTripStartKm(trip)).toBe(0);
  });

  it("ignores planned freights", () => {
    const trip = makeTrip({
      freights: [makeFreight(50, "planned")],
      fuelings: [makeFueling(200)],
    });
    expect(getTripStartKm(trip)).toBe(200);
  });
});

describe("getTripPendingPlannedFreights", () => {
  it("returns empty array for trip with no freights", () => {
    expect(getTripPendingPlannedFreights(makeTrip())).toEqual([]);
  });

  it("returns empty array when all freights are completed", () => {
    const trip = makeTrip({ freights: [makeFreight(100, "completed")] });
    expect(getTripPendingPlannedFreights(trip)).toEqual([]);
  });

  it("returns one item when one freight is planned", () => {
    const trip = makeTrip({ freights: [makeFreight(100, "planned")] });
    expect(getTripPendingPlannedFreights(trip)).toHaveLength(1);
  });

  it("returns only planned freights from a mix", () => {
    const trip = makeTrip({
      freights: [
        makeFreight(100, "planned"),
        makeFreight(200, "in_progress"),
        makeFreight(300, "completed"),
        makeFreight(400, "planned"),
      ],
    });
    const result = getTripPendingPlannedFreights(trip);
    expect(result).toHaveLength(2);
    expect(result.every((f) => f.status === "planned")).toBe(true);
  });
});

describe("buildRouteFailureDetails", () => {
  it("returns reason when present", () => {
    expect(buildRouteFailureDetails({ reason: "Rota não encontrada" })).toBe(
      "Rota não encontrada",
    );
  });

  it("returns fallback string when reason is null", () => {
    const result = buildRouteFailureDetails({ reason: null });
    expect(result).toMatch(/rota foi salva/i);
  });
});

describe("buildOfflineSyncRouteToast", () => {
  it("returns null for empty array", () => {
    expect(buildOfflineSyncRouteToast([])).toBeNull();
  });

  it("returns notice with singular description for one failure", () => {
    const result = buildOfflineSyncRouteToast(["fail-1"]);
    expect(result).not.toBeNull();
    expect(result!.title).toBe("Sincronização parcial");
    expect(result!.description).toMatch(/Um frete/);
  });

  it("returns notice with plural description for multiple failures", () => {
    const result = buildOfflineSyncRouteToast(["f1", "f2", "f3"]);
    expect(result).not.toBeNull();
    expect(result!.description).toMatch(/3 fretes/);
  });
});

describe("getFreightCreationFeedback", () => {
  it("returns success variant for in_progress status", () => {
    expect(getFreightCreationFeedback("in_progress").variant).toBe("success");
  });

  it("returns notice variant for planned status", () => {
    expect(getFreightCreationFeedback("planned").variant).toBe("notice");
  });
});

describe("getVehicleCurrentKmFromSources", () => {
  it("returns maxKm=0 and hasKmRecords=false with no records", () => {
    expect(
      getVehicleCurrentKmFromSources({ freightKms: [], fuelingKms: [] }),
    ).toEqual({ maxKm: 0, hasKmRecords: false });
  });

  it("includes km=0 as a valid record (hasKmRecords=true)", () => {
    const result = getVehicleCurrentKmFromSources({
      freightKms: [0],
      fuelingKms: [],
    });
    expect(result.hasKmRecords).toBe(true);
    expect(result.maxKm).toBe(0);
  });

  it("returns hasKmRecords=false when all values are null", () => {
    const result = getVehicleCurrentKmFromSources({
      freightKms: [null, undefined],
      fuelingKms: [null],
    });
    expect(result.hasKmRecords).toBe(false);
  });

  it("returns max of valid values only", () => {
    const result = getVehicleCurrentKmFromSources({
      freightKms: [100, null, 500],
      fuelingKms: [300, undefined],
    });
    expect(result.maxKm).toBe(500);
    expect(result.hasKmRecords).toBe(true);
  });
});

describe("toast helpers", () => {
  beforeEach(() => {
    toastMock.mockReset();
  });

  it("showActionSuccess calls toast with title and description", () => {
    showActionSuccess("Salvo", "Tudo certo");
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Salvo", description: "Tudo certo" }),
    );
  });

  it("showActionError calls toast with variant destructive", () => {
    showActionError("Erro", "Detalhe");
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ variant: "destructive", title: "Erro" }),
    );
  });

  it("showActionError uses default description when none passed", () => {
    showActionError("Erro");
    const call = toastMock.mock.calls[0][0];
    expect(call.description).toBeTruthy();
  });

  it("showActionNotice calls toast with variant notice", () => {
    showActionNotice("Aviso", "Info");
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ variant: "notice", title: "Aviso" }),
    );
  });

  it("showOfflineSaved calls toast with notice variant and description mentioning nuvem", () => {
    showOfflineSaved("Salvo offline");
    const call = toastMock.mock.calls[0][0];
    expect(call.variant).toBe("notice");
    expect(call.description).toMatch(/nuvem/i);
  });

  it("showWarnings calls toast once per warning", () => {
    showWarnings(["aviso 1", "aviso 2", "aviso 3"]);
    expect(toastMock).toHaveBeenCalledTimes(3);
  });

  it("showWarnings does not call toast when list is empty", () => {
    showWarnings([]);
    expect(toastMock).not.toHaveBeenCalled();
  });
});

describe("ensureMutation", () => {
  it("resolves without error and returns result", async () => {
    const result = await ensureMutation(
      Promise.resolve({ data: { id: "1" }, error: null }),
      "fallback",
    );
    expect(result).toEqual({ data: { id: "1" }, error: null });
  });

  it("throws error.message when mutation returns error", async () => {
    await expect(
      ensureMutation(
        Promise.resolve({ data: null, error: { message: "DB fail" } }),
        "fallback",
      ),
    ).rejects.toThrow("DB fail");
  });

  it("throws fallbackMessage when error has no message", async () => {
    await expect(
      ensureMutation(
        Promise.resolve({ data: null, error: {} }),
        "fallback msg",
      ),
    ).rejects.toThrow("fallback msg");
  });
});

describe("getTripVehicleId", () => {
  beforeEach(() => {
    supabaseMock.from.mockClear();
    supabaseMock.chainBuilder.maybeSingle.mockReset();
    supabaseMock.chainBuilder.select.mockClear();
    supabaseMock.chainBuilder.eq.mockClear();
    // Reset chain to return itself
    supabaseMock.chainBuilder.select.mockReturnValue(supabaseMock.chainBuilder);
    supabaseMock.chainBuilder.eq.mockReturnValue(supabaseMock.chainBuilder);
  });

  it("returns vehicle_id when trip exists", async () => {
    supabaseMock.chainBuilder.maybeSingle.mockResolvedValueOnce({
      data: { vehicle_id: "vehicle-42" },
      error: null,
    });
    const result = await getTripVehicleId("trip-1");
    expect(result).toBe("vehicle-42");
  });

  it("throws when supabase returns an error", async () => {
    supabaseMock.chainBuilder.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: { message: "RLS denied" },
    });
    await expect(getTripVehicleId("trip-1")).rejects.toThrow("RLS denied");
  });

  it("throws fallback message when error has no message", async () => {
    supabaseMock.chainBuilder.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: { message: "" },
    });
    await expect(getTripVehicleId("trip-1")).rejects.toThrow(
      "Falha ao localizar o veículo da viagem.",
    );
  });

  it("throws when trip not found (data is null)", async () => {
    supabaseMock.chainBuilder.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: null,
    });
    await expect(getTripVehicleId("trip-1")).rejects.toThrow(
      "Viagem não encontrada para este abastecimento.",
    );
  });

  it("throws when vehicle_id is null", async () => {
    supabaseMock.chainBuilder.maybeSingle.mockResolvedValueOnce({
      data: { vehicle_id: null },
      error: null,
    });
    await expect(getTripVehicleId("trip-1")).rejects.toThrow(
      "Viagem não encontrada para este abastecimento.",
    );
  });
});
