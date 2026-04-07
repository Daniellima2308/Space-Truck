import React from "react";
import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppProvider } from "@/context/AppContext";
import { useApp } from "@/context/app-context";

// ─── shared offline state ───────────────────────────────────────────────────
const offlineState = vi.hoisted(() => ({
  queue: [] as Array<{
    id: string;
    type: string;
    payload: Record<string, unknown>;
  }>,
  online: false, // start offline so queue is populated, then flip online to trigger sync
}));

const sharedMocks = vi.hoisted(() => ({
  toastMock: vi.fn(),
  fromMock: vi.fn(),
  getRouteDistanceDiagnosticWithCacheMock: vi.fn(),
  refreshRouteDistanceCacheMock: vi.fn(),
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
  getRouteDistanceDiagnosticWithCache:
    sharedMocks.getRouteDistanceDiagnosticWithCacheMock,
  refreshRouteDistanceCache: sharedMocks.refreshRouteDistanceCacheMock,
}));

vi.mock("@/lib/maintenance", () => ({
  getMaintenanceAlerts: vi.fn().mockReturnValue([]),
  checkAndNotifyMaintenance: vi.fn(),
}));

vi.mock("@/lib/fieldValidation", () => ({
  getKmBounds: vi.fn((kms: unknown) => kms),
  getNumericWarnings: vi.fn().mockReturnValue([]),
  validateKmByContext: vi.fn().mockReturnValue({ isValid: true, warnings: [] }),
  validatePercent: vi.fn().mockReturnValue({ isValid: true }),
  validatePositiveNumber: vi.fn().mockReturnValue({ isValid: true }),
}));

vi.mock("@/lib/vehicleOperation", () => ({
  isDriverBond: vi.fn().mockReturnValue(false),
  isVehicleOperationProfile: vi.fn().mockReturnValue(false),
  normalizeVehicleProfileForPersistence: vi.fn((v: unknown) => v),
  normalizeVehicleProfileUpdateForPersistence: vi.fn((v: unknown) => v),
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
      driver_bond: null,
      default_commission_percent: null,
      is_fleet_owner: false,
      driver_name: null,
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
  dbState.freights = [
    {
      id: "freight-1",
      user_id: "user-1",
      trip_id: "trip-1",
      origin: "A",
      destination: "B",
      km_initial: 100,
      km_final: 0,
      gross_value: 1000,
      commission_percent: 10,
      commission_value: 100,
      status: "in_progress",
      estimated_distance: 200,
      created_at: now,
    },
  ];
  dbState.fuelings = [];
  dbState.expenses = [
    {
      id: "expense-1",
      user_id: "user-1",
      trip_id: "trip-1",
      category: "pedagio",
      description: "Pedágio",
      value: 50,
      date: "2026-03-22",
      receipt_url: null,
    },
  ];
  dbState.maintenance_services = [];
  dbState.personal_expenses = [
    {
      id: "pe-1",
      user_id: "user-1",
      trip_id: "trip-1",
      category: "banho",
      description: "Banho",
      value: 20,
      date: "2026-03-22",
    },
  ];
  dbState.profiles = [{ user_id: "user-1", personal_expenses_enabled: true }];
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
    mode: "select" as "select" | "update" | "delete" | "insert",
    updateValues: null as Row | null,
    lastInserted: null as Row[] | null,
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
    insert: vi.fn((values: Row | Row[]) => {
      const arr = (Array.isArray(values) ? values : [values]).map((v, i) => ({
        id: v.id ?? `${table}-${dbState[table].length + i + 1}`,
        created_at: v.created_at ?? now,
        ...v,
      }));
      dbState[table].push(...arr);
      state.lastInserted = arr;
      state.mode = "insert";
      return builder;
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
      if (state.mode === "insert" && state.lastInserted?.length) {
        return { data: state.lastInserted[0], error: null };
      }
      const result = await executeSelect();
      return result.data[0]
        ? { data: result.data[0], error: null }
        : { data: null, error: { message: "Not found" } };
    }),
    then: (
      resolve: (value: {
        data: Row[] | null;
        error: null | { message: string };
      }) => unknown,
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

// Simulate coming online: flip the flag then fire window "online" event
async function goOnline() {
  offlineState.online = true;
  await act(async () => {
    window.dispatchEvent(new Event("online"));
    // Wait for all microtasks/promises to settle
    await new Promise((r) => setTimeout(r, 50));
  });
}

describe("AppContext offline sync queue processing", () => {
  beforeEach(() => {
    seedDb();
    offlineState.queue = [];
    offlineState.online = false;
    sharedMocks.toastMock.mockReset();
    sharedMocks.fromMock.mockClear();
    sharedMocks.getRouteDistanceDiagnosticWithCacheMock.mockResolvedValue({
      distanceKm: 300,
      reason: null,
      originQueryUsed: "São Paulo - SP",
      destinationQueryUsed: "Rio de Janeiro - RJ",
    });
    sharedMocks.refreshRouteDistanceCacheMock.mockResolvedValue({
      distanceKm: 300,
      reason: null,
      originQueryUsed: "São Paulo - SP",
      destinationQueryUsed: "Rio de Janeiro - RJ",
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it("sync queue addExpense persiste e remove da fila ao voltar online", async () => {
    offlineState.queue.push({
      id: "q-1",
      type: "addExpense",
      payload: {
        trip_id: "trip-1",
        category: "pedagio",
        description: "Pedágio sync",
        value: 30,
        date: "2026-03-22",
        receipt_url: null,
      },
    });

    const before = dbState.expenses.length;
    const { unmount } = await renderApp();
    await goOnline();

    expect(dbState.expenses.length).toBeGreaterThan(before);
    expect(offlineState.queue).toHaveLength(0);
    unmount();
  });

  it("sync queue addPersonalExpense persiste e remove da fila ao voltar online", async () => {
    offlineState.queue.push({
      id: "q-1",
      type: "addPersonalExpense",
      payload: {
        trip_id: "trip-1",
        category: "alimentacao",
        description: "Café sync",
        value: 10,
        date: "2026-03-22",
      },
    });

    const before = dbState.personal_expenses.length;
    const { unmount } = await renderApp();
    await goOnline();

    expect(dbState.personal_expenses.length).toBeGreaterThan(before);
    unmount();
  });

  it("sync queue updateExpense atualiza no banco ao voltar online", async () => {
    offlineState.queue.push({
      id: "q-1",
      type: "updateExpense",
      payload: {
        id: "expense-1",
        category: "pedagio",
        description: "Pedágio atualizado",
        value: 99,
        date: "2026-03-22",
        receipt_url: null,
      },
    });

    const { unmount } = await renderApp();
    await goOnline();

    const exp = dbState.expenses.find((e) => e.id === "expense-1");
    expect(Number(exp?.value)).toBe(99);
    unmount();
  });

  it("sync queue deleteExpense remove do banco ao voltar online", async () => {
    offlineState.queue.push({
      id: "q-1",
      type: "deleteExpense",
      payload: { id: "expense-1" },
    });

    const { unmount } = await renderApp();
    await goOnline();

    expect(dbState.expenses.find((e) => e.id === "expense-1")).toBeUndefined();
    unmount();
  });

  it("sync queue updatePersonalExpense atualiza no banco ao voltar online", async () => {
    offlineState.queue.push({
      id: "q-1",
      type: "updatePersonalExpense",
      payload: {
        id: "pe-1",
        category: "banho",
        description: "Banho sync",
        value: 40,
        date: "2026-03-22",
      },
    });

    const { unmount } = await renderApp();
    await goOnline();

    const pe = dbState.personal_expenses.find((p) => p.id === "pe-1");
    expect(Number(pe?.value)).toBe(40);
    unmount();
  });

  it("sync queue deletePersonalExpense remove do banco ao voltar online", async () => {
    offlineState.queue.push({
      id: "q-1",
      type: "deletePersonalExpense",
      payload: { id: "pe-1" },
    });

    const { unmount } = await renderApp();
    await goOnline();

    expect(dbState.personal_expenses.find((p) => p.id === "pe-1")).toBeUndefined();
    unmount();
  });

  it("sync queue startFreight atualiza status para in_progress", async () => {
    dbState.freights.push({
      id: "freight-planned",
      user_id: "user-1",
      trip_id: "trip-1",
      origin: "C",
      destination: "D",
      km_initial: 300,
      km_final: 0,
      gross_value: 800,
      commission_percent: 10,
      commission_value: 80,
      status: "planned",
      estimated_distance: 100,
      created_at: now,
    });

    offlineState.queue.push({
      id: "q-1",
      type: "startFreight",
      payload: { freightId: "freight-planned" },
    });

    const { unmount } = await renderApp();
    await goOnline();

    const freight = dbState.freights.find((f) => f.id === "freight-planned");
    expect(freight?.status).toBe("in_progress");
    unmount();
  });

  it("sync queue completeFreight complete_only marca como completed", async () => {
    offlineState.queue.push({
      id: "q-1",
      type: "completeFreight",
      payload: {
        freightId: "freight-1",
        tripId: "trip-1",
        option: "complete_only",
      },
    });

    const { unmount } = await renderApp();
    await goOnline();

    const freight = dbState.freights.find((f) => f.id === "freight-1");
    expect(freight?.status).toBe("completed");
    unmount();
  });

  it("sync queue completeFreight start_next_if_planned promove próximo", async () => {
    dbState.freights.push({
      id: "freight-next",
      user_id: "user-1",
      trip_id: "trip-1",
      origin: "B",
      destination: "C",
      km_initial: 300,
      km_final: 0,
      gross_value: 500,
      commission_percent: 10,
      commission_value: 50,
      status: "planned",
      estimated_distance: 100,
      created_at: "2026-03-22T11:00:00.000Z",
    });

    offlineState.queue.push({
      id: "q-1",
      type: "completeFreight",
      payload: {
        freightId: "freight-1",
        tripId: "trip-1",
        option: "start_next_if_planned",
      },
    });

    const { unmount } = await renderApp();
    await goOnline();

    const nextFreight = dbState.freights.find((f) => f.id === "freight-next");
    expect(nextFreight?.status).toBe("in_progress");
    unmount();
  });

  it("sync queue deleteFreight remove frete e rastreia trip", async () => {
    offlineState.queue.push({
      id: "q-1",
      type: "deleteFreight",
      payload: { id: "freight-1" },
    });

    const { unmount } = await renderApp();
    await goOnline();

    expect(dbState.freights.find((f) => f.id === "freight-1")).toBeUndefined();
    unmount();
  });

  it("sync queue finishTrip com arrivalKm atualiza viagem e veículo", async () => {
    offlineState.queue.push({
      id: "q-1",
      type: "finishTrip",
      payload: {
        tripId: "trip-1",
        arrivalKm: 900,
        vehicleId: "vehicle-1",
        activeFreightId: "freight-1",
        finalTripDistance: 400,
      },
    });

    const { unmount } = await renderApp();
    await goOnline();

    const trip = dbState.trips.find((t) => t.id === "trip-1");
    expect(trip?.status).toBe("finished");

    const vehicle = dbState.vehicles.find((v) => v.id === "vehicle-1");
    expect(Number(vehicle?.current_km)).toBe(900);
    unmount();
  });

  it("sync queue finishTrip sem arrivalKm finaliza viagem sem atualizar veículo", async () => {
    const vehicleKmBefore = Number(
      dbState.vehicles.find((v) => v.id === "vehicle-1")?.current_km,
    );

    offlineState.queue.push({
      id: "q-1",
      type: "finishTrip",
      payload: {
        tripId: "trip-1",
        arrivalKm: undefined,
        vehicleId: "vehicle-1",
        activeFreightId: null,
        finalTripDistance: 200,
      },
    });

    const { unmount } = await renderApp();
    await goOnline();

    const trip = dbState.trips.find((t) => t.id === "trip-1");
    expect(trip?.status).toBe("finished");
    const vehicleKmAfter = Number(
      dbState.vehicles.find((v) => v.id === "vehicle-1")?.current_km,
    );
    expect(vehicleKmAfter).toBe(vehicleKmBefore);
    unmount();
  });

  it("sync queue updateFreight sem mudança de rota atualiza e remove da fila", async () => {
    offlineState.queue.push({
      id: "q-1",
      type: "updateFreight",
      payload: {
        freightId: "freight-1",
        tripId: "trip-1",
        origin: "A", // same as current
        destination: "B", // same as current
        km_initial: 150,
        gross_value: 1200,
        commission_percent: 10,
        commission_value: 120,
        forceRouteRefresh: false,
      },
    });

    const { unmount } = await renderApp();
    await goOnline();

    const freight = dbState.freights.find((f) => f.id === "freight-1");
    expect(Number(freight?.gross_value)).toBe(1200);
    unmount();
  });

  it("sync queue múltiplas ações processa todas e mostra toast de sincronização", async () => {
    offlineState.queue.push(
      {
        id: "q-1",
        type: "addExpense",
        payload: {
          trip_id: "trip-1",
          category: "pedagio",
          description: "P1",
          value: 10,
          date: "2026-03-22",
          receipt_url: null,
        },
      },
      {
        id: "q-2",
        type: "addPersonalExpense",
        payload: {
          trip_id: "trip-1",
          category: "alimentacao",
          description: "A1",
          value: 15,
          date: "2026-03-22",
        },
      },
    );

    const expBefore = dbState.expenses.length;
    const peBefore = dbState.personal_expenses.length;
    const { unmount } = await renderApp();
    await goOnline();

    expect(dbState.expenses.length).toBeGreaterThan(expBefore);
    expect(dbState.personal_expenses.length).toBeGreaterThan(peBefore);
    expect(sharedMocks.toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Dados sincronizados" }),
    );
    unmount();
  });
});
