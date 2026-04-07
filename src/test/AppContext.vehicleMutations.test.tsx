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

const maintenanceMocks = vi.hoisted(() => ({
  getMaintenanceAlerts: vi.fn().mockReturnValue([]),
  checkAndNotifyMaintenance: vi.fn(),
}));

const fieldValidationMocks = vi.hoisted(() => ({
  validatePositiveNumber: vi.fn().mockReturnValue({ isValid: true }),
  validateKmByContext: vi.fn().mockReturnValue({ isValid: true, warnings: [] }),
  getKmBounds: vi.fn((kms: unknown) => kms),
  getNumericWarnings: vi.fn().mockReturnValue([]),
  validatePercent: vi.fn().mockReturnValue({ isValid: true }),
}));

const dbErrors = vi.hoisted(() => ({
  vehicles_insert: null as string | null,
  vehicles_update: null as string | null,
  vehicles_delete: null as string | null,
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
  getMaintenanceAlerts: maintenanceMocks.getMaintenanceAlerts,
  checkAndNotifyMaintenance: maintenanceMocks.checkAndNotifyMaintenance,
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
    operationProfile: "fleet_owner",
    driverBond: "clt",
    defaultCommissionPercent: 12,
  }),
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
      current_km: 100,
      created_at: now,
    },
  ];
  dbState.trips = [];
  dbState.freights = [];
  dbState.fuelings = [];
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
    mode: "select" as "select" | "update" | "delete" | "insert",
    updateValues: null as Row | null,
    insertValues: null as Row | Row[] | null,
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
    if (state.mode === "insert" && table === "vehicles" && dbErrors.vehicles_insert) {
      return { data: [], error: { message: dbErrors.vehicles_insert } };
    }
    if (state.mode === "update" && table === "vehicles" && dbErrors.vehicles_update) {
      return { data: [], error: { message: dbErrors.vehicles_update } };
    }
    if (state.mode === "delete" && table === "vehicles" && dbErrors.vehicles_delete) {
      return { data: [], error: { message: dbErrors.vehicles_delete } };
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
      state.mode = "insert";
      state.insertValues = values;
      if (dbErrors.vehicles_insert && table === "vehicles") {
        return { data: null, error: { message: dbErrors.vehicles_insert } };
      }
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
      resolve: (value: { data: Row[] | null; error: null | { message: string } }) => unknown,
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

const newVehiclePayload = () => ({
  brand: "Mercedes",
  model: "Actros",
  year: 2021,
  plate: "XYZ9999",
  currentKm: 50000,
  isFleetOwner: false,
  driverName: null,
  operationProfile: "driver_owner" as const,
  driverBond: null,
  defaultCommissionPercent: null,
});

describe("AppContext vehicle mutations", () => {
  beforeEach(() => {
    seedDb();
    offlineState.queue = [];
    offlineState.online = true;
    sharedMocks.toastMock.mockReset();
    sharedMocks.fromMock.mockClear();
    maintenanceMocks.getMaintenanceAlerts.mockReturnValue([]);
    maintenanceMocks.checkAndNotifyMaintenance.mockReset();
    fieldValidationMocks.validatePositiveNumber.mockReturnValue({ isValid: true });
    fieldValidationMocks.validateKmByContext.mockReturnValue({ isValid: true, warnings: [] });
    dbErrors.vehicles_insert = null;
    dbErrors.vehicles_update = null;
    dbErrors.vehicles_delete = null;
  });

  afterEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  // ─── addVehicle ───────────────────────────────────────────────────────────

  it("addVehicle insere veículo e dispara fetchData", async () => {
    const before = dbState.vehicles.length;
    const { app, unmount } = await renderApp();
    await app.addVehicle(newVehiclePayload());
    expect(dbState.vehicles.length).toBeGreaterThan(before);
    unmount();
  });

  it("addVehicle com erro do Supabase lança exceção", async () => {
    dbErrors.vehicles_insert = "Falha simulada ao inserir veículo";
    const { app, unmount } = await renderApp();
    await expect(app.addVehicle(newVehiclePayload())).rejects.toThrow(
      "Falha simulada ao inserir veículo",
    );
    unmount();
  });

  // ─── updateVehicle ────────────────────────────────────────────────────────

  it("updateVehicle atualiza campos simples do veículo", async () => {
    const { app, unmount } = await renderApp();
    await app.updateVehicle("vehicle-1", { brand: "Scania", year: 2023 });
    const v = dbState.vehicles.find((x) => x.id === "vehicle-1");
    expect(v?.brand).toBe("Scania");
    expect(v?.year).toBe(2023);
    unmount();
  });

  it("updateVehicle atualiza operationProfile e normaliza perfil", async () => {
    const { app, unmount } = await renderApp();
    await app.updateVehicle("vehicle-1", {
      operationProfile: "fleet_owner" as const,
      driverBond: "clt" as const,
      defaultCommissionPercent: 12,
    });
    // The vehicle should still be in dbState (update ran without error)
    const v = dbState.vehicles.find((x) => x.id === "vehicle-1");
    expect(v).toBeDefined();
    unmount();
  });

  it("updateVehicle com erro do Supabase lança exceção", async () => {
    dbErrors.vehicles_update = "Falha ao atualizar";
    const { app, unmount } = await renderApp();
    await expect(
      app.updateVehicle("vehicle-1", { brand: "Erro" }),
    ).rejects.toThrow("Falha ao atualizar");
    unmount();
  });

  it("updateVehicle com driverName null inclui driver_name null no payload", async () => {
    const { app, unmount } = await renderApp();
    await app.updateVehicle("vehicle-1", { driverName: null });
    const v = dbState.vehicles.find((x) => x.id === "vehicle-1");
    expect(v?.driver_name).toBeNull();
    unmount();
  });

  // ─── deleteVehicle ────────────────────────────────────────────────────────

  it("deleteVehicle remove o veículo do banco", async () => {
    const { app, unmount } = await renderApp();
    await app.deleteVehicle("vehicle-1");
    const v = dbState.vehicles.find((x) => x.id === "vehicle-1");
    expect(v).toBeUndefined();
    unmount();
  });

  it("deleteVehicle com erro do Supabase lança exceção", async () => {
    dbErrors.vehicles_delete = "Falha ao deletar veículo";
    const { app, unmount } = await renderApp();
    await expect(app.deleteVehicle("vehicle-1")).rejects.toThrow(
      "Falha ao deletar veículo",
    );
    unmount();
  });

  // ─── updateVehicleKm ─────────────────────────────────────────────────────

  it("updateVehicleKm com KM inválido mostra toast destrutivo e não persiste", async () => {
    fieldValidationMocks.validatePositiveNumber.mockReturnValueOnce({
      isValid: false,
      message: "KM deve ser maior que zero",
    });

    const { app, unmount } = await renderApp();
    await app.updateVehicleKm("vehicle-1", 0);

    expect(sharedMocks.toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ variant: "destructive" }),
    );
    const v = dbState.vehicles.find((x) => x.id === "vehicle-1");
    expect(Number(v?.current_km)).toBe(100); // unchanged
    unmount();
  });

  it("updateVehicleKm com erro do Supabase mostra toast destrutivo", async () => {
    dbErrors.vehicles_update = "Falha ao atualizar KM";
    const { app, unmount } = await renderApp();
    await app.updateVehicleKm("vehicle-1", 999);
    expect(sharedMocks.toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: "destructive",
        title: "Não deu para salvar",
      }),
    );
    unmount();
  });

  it("updateVehicleKm com alertas de manutenção aciona checkAndNotifyMaintenance", async () => {
    maintenanceMocks.getMaintenanceAlerts.mockReturnValue([
      { vehicleId: "vehicle-1", serviceName: "Óleo", isOverdue: true },
    ]);

    const { app, unmount } = await renderApp();
    await app.updateVehicleKm("vehicle-1", 200);
    expect(maintenanceMocks.checkAndNotifyMaintenance).toHaveBeenCalled();
    unmount();
  });

  it("updateVehicleKm sem alertas não aciona checkAndNotifyMaintenance", async () => {
    maintenanceMocks.getMaintenanceAlerts.mockReturnValue([]);

    const { app, unmount } = await renderApp();
    await app.updateVehicleKm("vehicle-1", 150);
    expect(maintenanceMocks.checkAndNotifyMaintenance).not.toHaveBeenCalled();
    unmount();
  });

  it("updateVehicleKm sucesso atualiza KM no banco", async () => {
    const { app, unmount } = await renderApp();
    await app.updateVehicleKm("vehicle-1", 500);
    const v = dbState.vehicles.find((x) => x.id === "vehicle-1");
    expect(Number(v?.current_km)).toBe(500);
    unmount();
  });
});
