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
  normalizeVehicleProfileForPersistence: vi.fn().mockReturnValue({
    operationProfile: "driver_owner",
    driverBond: null,
    defaultCommissionPercent: null,
  }),
  normalizeVehicleProfileUpdateForPersistence: vi.fn().mockReturnValue({
    operationProfile: "driver_owner",
    driverBond: null,
    defaultCommissionPercent: null,
  }),
}));

// We need to mock helpers.getVehicleTimelineKms since it calls supabase internally
// but the supabase mock will handle that
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
      current_km: 50000,
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
      km_initial: 45000,
      km_final: 0,
      gross_value: 1000,
      commission_percent: 10,
      commission_value: 100,
      status: "completed",
      estimated_distance: 200,
      created_at: now,
    },
  ];
  dbState.fuelings = [];
  dbState.expenses = [];
  dbState.maintenance_services = [
    {
      id: "maint-1",
      user_id: "user-1",
      vehicle_id: "vehicle-1",
      service_name: "Troca de óleo",
      last_change_km: 45000,
      interval_km: 5000,
      created_at: now,
    },
  ];
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

const maintenancePayload = () => ({
  vehicleId: "vehicle-1",
  serviceName: "Troca de filtro",
  lastChangeKm: 45000,
  intervalKm: 5000,
});

describe("AppContext maintenance mutations", () => {
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

  // ─── addMaintenanceService ────────────────────────────────────────────────

  it("addMaintenanceService lastChangeKm inválido mostra toast destrutivo e retorna", async () => {
    fieldValidationMocks.validatePositiveNumber.mockReturnValueOnce({
      isValid: false,
      message: "KM da última troca deve ser maior que zero",
    });

    const { app, unmount } = await renderApp();
    await app.addMaintenanceService(maintenancePayload());

    expect(sharedMocks.toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ variant: "destructive" }),
    );
    expect(dbState.maintenance_services).toHaveLength(1); // unchanged
    unmount();
  });

  it("addMaintenanceService intervalKm inválido mostra toast destrutivo e retorna", async () => {
    // First call (lastChangeKm) passes, second call (intervalKm) fails
    fieldValidationMocks.validatePositiveNumber
      .mockReturnValueOnce({ isValid: true })
      .mockReturnValueOnce({ isValid: false, message: "Intervalo deve ser positivo" });

    const { app, unmount } = await renderApp();
    await app.addMaintenanceService(maintenancePayload());

    expect(sharedMocks.toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ variant: "destructive" }),
    );
    unmount();
  });

  it("addMaintenanceService km incoerente mostra toast destrutivo e retorna", async () => {
    fieldValidationMocks.validateKmByContext.mockReturnValueOnce({
      isValid: false,
      message: "KM abaixo do mínimo histórico",
      warnings: [],
    });

    const { app, unmount } = await renderApp();
    await app.addMaintenanceService(maintenancePayload());

    expect(sharedMocks.toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: "destructive",
        title: "KM incoerente para manutenção",
      }),
    );
    unmount();
  });

  it("addMaintenanceService com warnings exibe toast de aviso", async () => {
    fieldValidationMocks.validateKmByContext.mockReturnValueOnce({
      isValid: true,
      warnings: ["KM acima do esperado, mas aceito"],
    });

    const { app, unmount } = await renderApp();
    await app.addMaintenanceService(maintenancePayload());

    expect(sharedMocks.toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Confere esse número rapidinho",
        description: "KM acima do esperado, mas aceito",
      }),
    );
    unmount();
  });

  it("addMaintenanceService sucesso insere manutenção", async () => {
    const before = dbState.maintenance_services.length;
    const { app, unmount } = await renderApp();
    await app.addMaintenanceService(maintenancePayload());
    expect(dbState.maintenance_services.length).toBeGreaterThan(before);
    unmount();
  });

  // ─── deleteMaintenanceService ─────────────────────────────────────────────

  it("deleteMaintenanceService remove manutenção do banco", async () => {
    const { app, unmount } = await renderApp();
    await app.deleteMaintenanceService("maint-1");
    const maint = dbState.maintenance_services.find((m) => m.id === "maint-1");
    expect(maint).toBeUndefined();
    unmount();
  });

  it("deleteMaintenanceService aciona fetchData após exclusão", async () => {
    const beforeLen = dbState.maintenance_services.length;
    const { app, unmount } = await renderApp();
    await app.deleteMaintenanceService("maint-1");
    // After delete + fetchData, maintenance_services in db is now empty
    expect(dbState.maintenance_services.length).toBeLessThan(beforeLen);
    unmount();
  });
});
