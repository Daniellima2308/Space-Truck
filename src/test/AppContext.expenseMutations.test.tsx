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

const dbErrors = vi.hoisted(() => ({
  trips_delete: null as string | null,
  expenses_update: null as string | null,
  personal_expenses_update: null as string | null,
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
      current_km: 100,
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
    {
      id: "trip-finished",
      user_id: "user-1",
      vehicle_id: "vehicle-1",
      status: "finished",
      created_at: "2026-03-01T10:00:00.000Z",
      finished_at: "2026-03-02T10:00:00.000Z",
      estimated_distance: 300,
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
      gross_value: 1000,
      commission_percent: 10,
      commission_value: 100,
      status: "in_progress",
      estimated_distance: 200,
      created_at: now,
    },
  ];
  dbState.expenses = [
    {
      id: "expense-1",
      user_id: "user-1",
      trip_id: "trip-1",
      category: "pedagio",
      description: "Pedágio",
      value: 100,
      date: "2026-03-22",
      receipt_url: null,
    },
  ];
  dbState.fuelings = [];
  dbState.maintenance_services = [];
  dbState.personal_expenses = [];
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
    if (state.mode === "update" && table === "expenses" && dbErrors.expenses_update) {
      return { data: [], error: { message: dbErrors.expenses_update } };
    }
    if (state.mode === "update" && table === "personal_expenses" && dbErrors.personal_expenses_update) {
      return { data: [], error: { message: dbErrors.personal_expenses_update } };
    }
    if (state.mode === "delete" && table === "trips" && dbErrors.trips_delete) {
      return { data: [], error: { message: dbErrors.trips_delete } };
    }

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
      resolve: (value: { data: Row[]; error: null | { message: string } }) => unknown,
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

const expensePayload = () => ({
  category: "pedagio" as const,
  description: "Pedágio SP",
  value: 50,
  date: "2026-03-22",
});

describe("AppContext expense mutations", () => {
  beforeEach(() => {
    seedDb();
    offlineState.queue = [];
    offlineState.online = true;
    sharedMocks.toastMock.mockReset();
    sharedMocks.fromMock.mockClear();
    dbErrors.trips_delete = null;
    dbErrors.expenses_update = null;
    dbErrors.personal_expenses_update = null;
  });

  afterEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it("addExpense offline enfileira", async () => {
    offlineState.online = false;
    const { app, unmount } = await renderApp();
    await app.addExpense("trip-1", expensePayload());
    expect(offlineState.queue).toHaveLength(1);
    expect(offlineState.queue[0].type).toBe("addExpense");
    unmount();
  });

  it("addExpense online persiste e mostra sucesso", async () => {
    const beforeCount = dbState.expenses.length;
    const { app, unmount } = await renderApp();
    await app.addExpense("trip-1", expensePayload());
    expect(dbState.expenses.length).toBeGreaterThan(beforeCount);
    expect(sharedMocks.toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Despesa salva" }),
    );
    unmount();
  });

  it("updateExpense offline enfileira", async () => {
    offlineState.online = false;
    const { app, unmount } = await renderApp();
    await app.updateExpense("trip-1", "expense-1", expensePayload());
    expect(offlineState.queue).toHaveLength(1);
    expect(offlineState.queue[0].type).toBe("updateExpense");
    unmount();
  });

  it("updateExpense com erro do Supabase mostra toast de erro", async () => {
    dbErrors.expenses_update = "RLS bloqueou";
    const originalValue = (dbState.expenses.find((e) => e.id === "expense-1") as Row)?.value;
    const { app, unmount } = await renderApp();
    await app.updateExpense("trip-1", "expense-1", { ...expensePayload(), value: 999 });
    expect(sharedMocks.toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ variant: "destructive" }),
    );
    const expense = dbState.expenses.find((e) => e.id === "expense-1") as Row;
    expect(expense.value).toBe(originalValue);
    unmount();
  });

  it("updateExpense sucesso atualiza e mostra toast", async () => {
    const { app, unmount } = await renderApp();
    await app.updateExpense("trip-1", "expense-1", { ...expensePayload(), value: 200 });
    const expense = dbState.expenses.find((e) => e.id === "expense-1") as Row;
    expect(expense.value).toBe(200);
    expect(sharedMocks.toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Despesa atualizada" }),
    );
    unmount();
  });

  it("updatePersonalExpense com erro do Supabase mostra toast de erro", async () => {
    dbState.personal_expenses.push({
      id: "pe-1",
      user_id: "user-1",
      trip_id: "trip-1",
      category: "banho",
      description: "Banho",
      value: 30,
      date: "2026-03-22",
    });
    dbErrors.personal_expenses_update = "DB error";

    const { app, unmount } = await renderApp();
    await app.updatePersonalExpense("trip-1", "pe-1", {
      category: "banho",
      description: "Banho",
      value: 999,
      date: "2026-03-22",
    });
    expect(sharedMocks.toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ variant: "destructive" }),
    );
    unmount();
  });

  it("clearHistory com viagens finalizadas remove em lote", async () => {
    dbState.trips.push({
      id: "trip-finished-2",
      user_id: "user-1",
      vehicle_id: "vehicle-1",
      status: "finished",
      created_at: "2026-03-03T10:00:00.000Z",
      finished_at: "2026-03-04T10:00:00.000Z",
      estimated_distance: 200,
    });

    const { app, unmount } = await renderApp();
    await app.clearHistory();

    const remaining = dbState.trips;
    expect(remaining.every((t) => t.status !== "finished")).toBe(true);
    expect(remaining.some((t) => t.status === "open")).toBe(true);
    unmount();
  });

  it("clearHistory sem finalizadas não faz requisição de delete", async () => {
    dbState.trips = dbState.trips.filter((t) => t.status !== "finished");

    const { app, unmount } = await renderApp();
    const tripsBefore = dbState.trips.length;
    await app.clearHistory();
    expect(dbState.trips.length).toBe(tripsBefore);
    unmount();
  });

  it("clearHistory com erro do Supabase mostra toast de erro", async () => {
    dbErrors.trips_delete = "Permissão negada";

    const { app, unmount } = await renderApp();
    await app.clearHistory();
    expect(sharedMocks.toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringMatching(/histórico/i),
        variant: "destructive",
      }),
    );
    unmount();
  });

  it("deleteExpense offline enfileira", async () => {
    offlineState.online = false;
    const { app, unmount } = await renderApp();
    await app.deleteExpense("trip-1", "expense-1");
    expect(offlineState.queue).toHaveLength(1);
    expect(offlineState.queue[0].type).toBe("deleteExpense");
    unmount();
  });

  it("deleteExpense online exclui", async () => {
    const { app, unmount } = await renderApp();
    await app.deleteExpense("trip-1", "expense-1");
    expect(dbState.expenses.find((e) => e.id === "expense-1")).toBeUndefined();
    unmount();
  });
});
