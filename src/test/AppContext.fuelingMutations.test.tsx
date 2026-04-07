import React from "react";
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppProvider } from "@/context/AppContext";
import { useApp } from "@/context/app-context";

const offlineState = vi.hoisted(() => ({
  queue: [] as Array<{
    id: string;
    type: string;
    payload: Record<string, unknown>;
  }>,
  online: true,
}));

const sharedMocks = vi.hoisted(() => ({
  toastMock: vi.fn(),
  fromMock: vi.fn(),
}));

const fieldValidationMocks = vi.hoisted(() => ({
  validatePositiveNumber: vi.fn().mockReturnValue({ isValid: true }),
  validateKmByContext: vi.fn().mockReturnValue({ isValid: true, warnings: [] }),
  getKmBounds: vi.fn((kms: unknown) => kms),
  getNumericWarnings: vi.fn().mockReturnValue([]),
  validatePercent: vi.fn().mockReturnValue({ isValid: true }),
}));

vi.mock("@/hooks/use-toast", () => ({
  toast: sharedMocks.toastMock,
}));

vi.mock("@/context/auth-context", () => ({
  useAuth: () => ({
    user: { id: "user-1" },
    session: null,
    loading: false,
    signOut: vi.fn(),
  }),
}));

vi.mock("@/lib/routeApi", () => ({
  getRouteDistanceDiagnosticWithCache: vi.fn(),
  refreshRouteDistanceCache: vi.fn(),
}));

vi.mock("@/lib/maintenance", () => ({
  getMaintenanceAlerts: vi.fn().mockReturnValue([]),
  checkAndNotifyMaintenance: vi.fn(),
}));

vi.mock("@/lib/fieldValidation", () => fieldValidationMocks);

vi.mock("@/lib/vehicleOperation", () => ({
  isDriverBond: vi.fn().mockReturnValue(false),
  isVehicleOperationProfile: vi.fn().mockReturnValue(false),
  normalizeVehicleProfileForPersistence: vi.fn((value: unknown) => value),
  normalizeVehicleProfileUpdateForPersistence: vi.fn((value: unknown) => value),
}));

vi.mock("@/lib/offlineQueue", () => ({
  isOnline: () => offlineState.online,
  getOfflineQueue: () => offlineState.queue,
  addToOfflineQueue: (action: { type: string; payload: Record<string, unknown> }) => {
    offlineState.queue.push({
      ...action,
      id: `queued-${offlineState.queue.length + 1}`,
    });
  },
  removeFromQueue: (id: string) => {
    offlineState.queue = offlineState.queue.filter((a) => a.id !== id);
  },
  getCachedData: vi.fn().mockReturnValue(null),
  setCachedData: vi.fn(),
}));

type Row = Record<string, unknown>;
type TableName = keyof typeof dbState;

const now = "2026-03-22T10:00:00.000Z";

const dbState = {
  vehicles: [] as Row[],
  trips: [] as Row[],
  freights: [] as Row[],
  fuelings: [] as Row[],
  expenses: [] as Row[],
  maintenance_services: [] as Row[],
  personal_expenses: [] as Row[],
  profiles: [] as Row[],
};

function seedDb() {
  dbState.vehicles = [
    {
      id: "vehicle-1",
      user_id: "user-1",
      brand: "Volvo",
      model: "FH",
      year: 2022,
      plate: "ABC1234",
      operation_profile: "driver_owner",
      current_km: 500,
      created_at: now,
    },
  ];
  dbState.trips = [
    {
      id: "trip-1",
      user_id: "user-1",
      vehicle_id: "vehicle-1",
      status: "open",
      created_at: now,
      finished_at: null,
      estimated_distance: 0,
    },
  ];
  dbState.freights = [];
  dbState.fuelings = [
    {
      id: "fueling-1",
      user_id: "user-1",
      trip_id: "trip-1",
      station: "Posto A",
      total_value: 500,
      liters: 80,
      price_per_liter: 6.25,
      km_current: 300,
      average: 0,
      full_tank: true,
      date: "2026-03-22",
      receipt_url: null,
      allocated_value: null,
      original_total_value: null,
    },
  ];
  dbState.expenses = [];
  dbState.maintenance_services = [];
  dbState.personal_expenses = [];
  dbState.profiles = [{ user_id: "user-1", personal_expenses_enabled: false }];
}

function applyFilters(
  rows: Row[],
  filters: Array<{ column: string; value: unknown; type: "eq" | "in" }>,
) {
  return rows.filter((row) =>
    filters.every((filter) => {
      if (filter.type === "eq") return row[filter.column] === filter.value;
      return Array.isArray(filter.value) && filter.value.includes(row[filter.column]);
    }),
  );
}

function makeBuilder(table: TableName) {
  const state = {
    filters: [] as Array<{ column: string; value: unknown; type: "eq" | "in" }>,
    order: null as null | { column: string; ascending: boolean },
    limit: null as number | null,
    mode: "select" as "select" | "update" | "delete",
    updateValues: null as Row | null,
  };

  const executeSelect = async () => {
    let rows = applyFilters(dbState[table], state.filters);
    if (state.order) {
      const { column, ascending } = state.order;
      rows = [...rows].sort((a, b) => {
        const aV = a[column], bV = b[column];
        if (aV === bV) return 0;
        if (aV == null) return 1;
        if (bV == null) return -1;
        return ascending
          ? String(aV).localeCompare(String(bV), "pt-BR", { numeric: true })
          : String(bV).localeCompare(String(aV), "pt-BR", { numeric: true });
      });
    }
    if (typeof state.limit === "number") rows = rows.slice(0, state.limit);
    return { data: rows, error: null };
  };

  const executeMutation = async () => {
    const rows = applyFilters(dbState[table], state.filters);
    if (state.mode === "update" && state.updateValues) {
      rows.forEach((row) => Object.assign(row, state.updateValues));
    }
    if (state.mode === "delete") {
      dbState[table] = dbState[table].filter((row) => !rows.includes(row));
    }
    return { data: rows, error: null };
  };

  const builder = {
    select: vi.fn(() => builder),
    insert: vi.fn(async (values: Row | Row[]) => {
      const arr = (Array.isArray(values) ? values : [values]).map((v, i) => ({
        id: v.id ?? `${table}-${dbState[table].length + i + 1}`,
        created_at: v.created_at ?? now,
        ...v,
      }));
      dbState[table].push(...arr);
      return { data: arr, error: null };
    }),
    update: vi.fn((values: Row) => {
      state.mode = "update";
      state.updateValues = values;
      return builder;
    }),
    delete: vi.fn(() => {
      state.mode = "delete";
      return builder;
    }),
    eq: vi.fn((column: string, value: unknown) => {
      state.filters.push({ column, value, type: "eq" });
      return builder;
    }),
    in: vi.fn((column: string, value: unknown[]) => {
      state.filters.push({ column, value, type: "in" });
      return builder;
    }),
    order: vi.fn((column: string, { ascending = true } = {}) => {
      state.order = { column, ascending };
      return builder;
    }),
    limit: vi.fn((value: number) => {
      state.limit = value;
      return builder;
    }),
    maybeSingle: vi.fn(async () => {
      const result = await executeSelect();
      return { data: result.data[0] ?? null, error: null };
    }),
    single: vi.fn(async () => {
      const result = await executeSelect();
      return result.data[0]
        ? { data: result.data[0], error: null }
        : { data: null, error: { message: "Not found" } };
    }),
    then: (
      resolve: (value: { data: Row[]; error: null }) => unknown,
      reject?: (reason: unknown) => unknown,
    ) => {
      const promise = state.mode === "select" ? executeSelect() : executeMutation();
      return promise.then(resolve, reject);
    },
  };

  return builder;
}

sharedMocks.fromMock.mockImplementation((table: TableName) => makeBuilder(table));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: sharedMocks.fromMock,
  },
}));

function AppHarness({ onReady }: { onReady: (ctx: ReturnType<typeof useApp>) => void }) {
  const ctx = useApp();
  React.useEffect(() => {
    if (!ctx.loading) onReady(ctx);
  }, [ctx, onReady]);
  return null;
}

async function renderApp() {
  let captured: ReturnType<typeof useApp> | null = null;
  const rendered = render(
    <AppProvider>
      <AppHarness onReady={(ctx) => { captured = ctx; }} />
    </AppProvider>,
  );
  await waitFor(() => expect(captured?.loading).toBe(false));
  return { app: captured!, unmount: rendered.unmount };
}

const fuelingPayload = () => ({
  stationName: "Posto B",
  totalValue: 300,
  liters: 50,
  kmCurrent: 600,
  date: "2026-03-22",
  fullTank: true,
});

describe("AppContext fueling mutations", () => {
  beforeEach(() => {
    seedDb();
    offlineState.queue = [];
    offlineState.online = true;
    sharedMocks.toastMock.mockReset();
    sharedMocks.fromMock.mockClear();
    fieldValidationMocks.validatePositiveNumber.mockReturnValue({ isValid: true });
    fieldValidationMocks.validateKmByContext.mockReturnValue({ isValid: true, warnings: [] });
  });

  afterEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it("addFueling offline enfileira", async () => {
    offlineState.online = false;
    const { app, unmount } = await renderApp();
    await app.addFueling("trip-1", fuelingPayload());
    expect(offlineState.queue).toHaveLength(1);
    expect(offlineState.queue[0].type).toBe("addFueling");
    unmount();
  });

  it("addFueling com totalValue inválido mostra erro", async () => {
    fieldValidationMocks.validatePositiveNumber.mockReturnValueOnce({
      isValid: false,
      message: "Valor inválido",
    });

    const countBefore = dbState.fuelings.length;
    const { app, unmount } = await renderApp();
    await app.addFueling("trip-1", { ...fuelingPayload(), totalValue: 0 });
    expect(sharedMocks.toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ variant: "destructive" }),
    );
    expect(dbState.fuelings.length).toBe(countBefore);
    unmount();
  });

  it("addFueling online salva e mostra sucesso", async () => {
    const countBefore = dbState.fuelings.length;
    const { app, unmount } = await renderApp();
    await app.addFueling("trip-1", fuelingPayload());
    expect(dbState.fuelings.length).toBeGreaterThan(countBefore);
    expect(sharedMocks.toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Abastecimento salvo" }),
    );
    unmount();
  });

  it("addFueling com KM incoerente mostra toast destrutivo e não persiste", async () => {
    fieldValidationMocks.validateKmByContext.mockReturnValueOnce({
      isValid: false,
      message: "KM muito baixo para este veículo",
    });

    const countBefore = dbState.fuelings.length;
    const { app, unmount } = await renderApp();
    await app.addFueling("trip-1", fuelingPayload());
    expect(sharedMocks.toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringMatching(/KM incoerente/i),
        variant: "destructive",
      }),
    );
    expect(dbState.fuelings.length).toBe(countBefore);
    unmount();
  });

  it("addFueling online com erro na persistência mostra toast de erro", async () => {
    const { app, unmount } = await renderApp();
    // Remove the trip so getTripVehicleId fails inside persistFuelingAdd
    dbState.trips = [];
    await app.addFueling("trip-1", fuelingPayload());
    expect(sharedMocks.toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: "destructive",
        title: expect.stringMatching(/Não foi possível salvar/i),
      }),
    );
    unmount();
  });

  it("updateFueling offline enfileira", async () => {
    offlineState.online = false;
    const { app, unmount } = await renderApp();
    await app.updateFueling("trip-1", "fueling-1", fuelingPayload());
    expect(offlineState.queue).toHaveLength(1);
    expect(offlineState.queue[0].type).toBe("updateFueling");
    unmount();
  });

  it("updateFueling com KM incoerente mostra erro", async () => {
    // validatePositiveNumber passes, but validateKmByContext fails
    fieldValidationMocks.validateKmByContext.mockReturnValueOnce({
      isValid: false,
      message: "KM muito baixo",
    });

    const { app, unmount } = await renderApp();
    await app.updateFueling("trip-1", "fueling-1", fuelingPayload());
    expect(sharedMocks.toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringMatching(/KM incoerente/i),
        variant: "destructive",
      }),
    );
    unmount();
  });

  it("deleteFueling offline enfileira", async () => {
    offlineState.online = false;
    const { app, unmount } = await renderApp();
    await app.deleteFueling("trip-1", "fueling-1");
    expect(offlineState.queue).toHaveLength(1);
    expect(offlineState.queue[0].type).toBe("deleteFueling");
    unmount();
  });

  it("deleteFueling online exclui e mostra sucesso", async () => {
    const { app, unmount } = await renderApp();
    await app.deleteFueling("trip-1", "fueling-1");
    expect(dbState.fuelings.find((f) => f.id === "fueling-1")).toBeUndefined();
    expect(sharedMocks.toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Abastecimento excluído" }),
    );
    unmount();
  });

  it("updateFueling online com erro na persistência mostra toast de erro", async () => {
    const { app, unmount } = await renderApp();
    // Remove the trip so getTripVehicleId fails inside persistFuelingUpdate
    dbState.trips = [];
    await app.updateFueling("trip-1", "fueling-1", fuelingPayload());
    expect(sharedMocks.toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: "destructive",
        title: expect.stringMatching(/Não foi possível atualizar/i),
      }),
    );
    unmount();
  });

  it("deleteFueling online com erro na persistência mostra toast de erro", async () => {
    const { app, unmount } = await renderApp();
    // Remove the trip so getTripVehicleId fails inside persistFuelingDelete
    dbState.trips = [];
    await app.deleteFueling("trip-1", "fueling-1");
    expect(sharedMocks.toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: "destructive",
        title: expect.stringMatching(/Não foi possível excluir/i),
      }),
    );
    unmount();
  });

  it("updateFueling online sucesso mostra toast de sucesso", async () => {
    const { app, unmount } = await renderApp();
    await app.updateFueling("trip-1", "fueling-1", fuelingPayload());
    expect(sharedMocks.toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Abastecimento atualizado" }),
    );
    unmount();
  });
});
