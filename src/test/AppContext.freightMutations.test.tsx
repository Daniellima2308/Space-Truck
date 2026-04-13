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
  getRouteDistanceDiagnosticWithCacheMock: vi.fn(),
  refreshRouteDistanceCacheMock: vi.fn(),
}));

const fieldValidationMocks = vi.hoisted(() => ({
  validatePositiveNumber: vi.fn().mockReturnValue({ isValid: true }),
  validateKmByContext: vi.fn().mockReturnValue({ isValid: true, warnings: [] }),
  getKmBounds: vi.fn((kms: unknown) => kms),
  getNumericWarnings: vi.fn().mockReturnValue([]),
  validatePercent: vi.fn().mockReturnValue({ isValid: true }),
}));

const dbErrors = vi.hoisted(() => ({
  freights_select: null as string | null,
  freights_insert: null as string | null,
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
      id: "freight-in-progress",
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
      payment_due_date: "2026-04-10",
      receivable_mode: "complete",
      amount_received: 300,
      advance_amount: 250,
      payer_name: "Pagador Original",
      delivery_proof_status: "pending_send",
      balance_release_mode: "proof_photo",
      balance_adjustments: [{ type: "discount", amount: 50 }],
      created_at: now,
    },
  ];
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
    mode: "select" as "select" | "update" | "delete",
    updateValues: null as Row | null,
    selectCols: "*" as string,
  };

  const executeSelect = async () => {
    if (table === "freights" && dbErrors.freights_select) {
      return { data: null, error: { message: dbErrors.freights_select } };
    }
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
    if (table === "freights" && dbErrors.freights_insert && state.mode === "update") {
      return { data: [], error: { message: dbErrors.freights_insert } };
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
    select: vi.fn((cols = "*") => {
      state.selectCols = cols;
      return builder;
    }),
    insert: vi.fn(async (values: Row | Row[]) => {
      if (table === "freights" && dbErrors.freights_insert) {
        return { data: null, error: { message: dbErrors.freights_insert } };
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
      if (result.error) return { data: null, error: result.error };
      return { data: result.data?.[0] ?? null, error: null };
    }),
    single: vi.fn(async () => {
      const result = await executeSelect();
      if (result.error) return { data: null, error: result.error };
      return result.data?.[0]
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

const freightPayload = () => ({
  origin: "São Paulo - SP",
  destination: "Rio de Janeiro - RJ",
  kmInitial: 100,
  grossValue: 2000,
  commissionPercent: 10,
  amountReceived: 0,
  paymentDueDate: undefined as string | undefined,
});

describe("AppContext freight mutations", () => {
  beforeEach(() => {
    seedDb();
    offlineState.queue = [];
    offlineState.online = true;
    sharedMocks.toastMock.mockReset();
    sharedMocks.fromMock.mockClear();
    dbErrors.freights_select = null;
    dbErrors.freights_insert = null;
    fieldValidationMocks.validatePositiveNumber.mockReturnValue({ isValid: true });
    fieldValidationMocks.validatePercent.mockReturnValue({ isValid: true });
    fieldValidationMocks.validateKmByContext.mockReturnValue({ isValid: true, warnings: [] });
    fieldValidationMocks.getNumericWarnings.mockReturnValue([]);
    // Default: route resolves with a distance
    sharedMocks.getRouteDistanceDiagnosticWithCacheMock.mockResolvedValue({
      distanceKm: 450,
      reason: null,
      originQueryUsed: "São Paulo - SP",
      destinationQueryUsed: "Rio de Janeiro - RJ",
    });
    sharedMocks.refreshRouteDistanceCacheMock.mockResolvedValue({
      distanceKm: 450,
      reason: null,
      originQueryUsed: "São Paulo - SP",
      destinationQueryUsed: "Rio de Janeiro - RJ",
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  // ─── addFreight ───────────────────────────────────────────────────────────

  it("addFreight com validação inválida lança erro", async () => {
    fieldValidationMocks.validatePositiveNumber.mockReturnValueOnce({
      isValid: false,
      message: "KM deve ser positivo",
    });

    const { app, unmount } = await renderApp();
    await expect(app.addFreight("trip-1", freightPayload())).rejects.toThrow(
      "KM deve ser positivo",
    );
    unmount();
  });

  it("addFreight com percentual inválido lança erro", async () => {
    // km ok, gross ok, percent fails
    fieldValidationMocks.validatePositiveNumber
      .mockReturnValueOnce({ isValid: true })
      .mockReturnValueOnce({ isValid: true });
    fieldValidationMocks.validatePercent.mockReturnValueOnce({
      isValid: false,
      message: "Comissão inválida",
    });

    const { app, unmount } = await renderApp();
    await expect(app.addFreight("trip-1", freightPayload())).rejects.toThrow(
      "Comissão inválida",
    );
    unmount();
  });

  it("addFreight com valor recebido inválido lança erro", async () => {
    const { app, unmount } = await renderApp();

    await expect(
      app.addFreight("trip-1", {
        ...freightPayload(),
        amountReceived: -1,
      }),
    ).rejects.toThrow("Valor recebido inválido");

    unmount();
  });

  it("addFreight com KM incoerente lança erro", async () => {
    fieldValidationMocks.validateKmByContext.mockReturnValueOnce({
      isValid: false,
      message: "KM abaixo do histórico",
      warnings: [],
    });

    const { app, unmount } = await renderApp();
    await expect(app.addFreight("trip-1", freightPayload())).rejects.toThrow(
      "KM abaixo do histórico",
    );
    unmount();
  });

  it("addFreight com warnings de KM exibe toast de aviso", async () => {
    fieldValidationMocks.validateKmByContext.mockReturnValueOnce({
      isValid: true,
      warnings: ["KM um pouco alto, mas aceito"],
    });

    const { app, unmount } = await renderApp();
    await app.addFreight("trip-1", freightPayload());

    expect(sharedMocks.toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ description: "KM um pouco alto, mas aceito" }),
    );
    unmount();
  });

  it("addFreight offline enfileira ação e mostra toast", async () => {
    const { app, unmount } = await renderApp();
    offlineState.online = false;
    const payload = {
      ...freightPayload(),
      amountReceived: 320,
      paymentDueDate: "2026-04-20",
    };

    const offlineResult = await app.addFreight("trip-1", payload);
    expect(offlineResult).toEqual({});

    expect(offlineState.queue).toHaveLength(1);
    expect(offlineState.queue[0].type).toBe("addFreight");
    expect(offlineState.queue[0].payload).toEqual(
      expect.objectContaining({
        amount_received: payload.amountReceived,
        payment_due_date: payload.paymentDueDate,
      }),
    );
    unmount();
  });

  it("addFreight offline com frete planned (já existe in_progress) mostra notice", async () => {
    // existing freight is in_progress, so next should be planned → notice variant
    const { app, unmount } = await renderApp();
    offlineState.online = false;

    await app.addFreight("trip-1", freightPayload());

    // showActionNotice or showOfflineSaved was called (depending on freightStatus)
    expect(sharedMocks.toastMock).toHaveBeenCalled();
    unmount();
  });

  it("addFreight online quando rota falha exibe notice mas insere com distância zero", async () => {
    // No existing in_progress → first freight → status = in_progress
    dbState.freights = [];
    sharedMocks.getRouteDistanceDiagnosticWithCacheMock.mockResolvedValue({
      distanceKm: null,
      reason: "geocoding_failed",
      originQueryUsed: null,
      destinationQueryUsed: null,
    });

    const { app, unmount } = await renderApp();
    await app.addFreight("trip-1", freightPayload());

    // Should have inserted the freight
    expect(dbState.freights.some((f) => f.origin === "São Paulo - SP")).toBe(true);
    // Should show notice toast
    expect(sharedMocks.toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Previsão ainda em ajuste" }),
    );
    unmount();
  });

  it("addFreight online com rota OK insere frete e mostra sucesso", async () => {
    dbState.freights = [];
    const payload = {
      ...freightPayload(),
      amountReceived: 500,
      paymentDueDate: "2026-04-30",
    };

    const { app, unmount } = await renderApp();
    const result = await app.addFreight("trip-1", payload);

    const insertedFreight = dbState.freights.find((f) => f.origin === "São Paulo - SP");
    expect(insertedFreight).toBeTruthy();
    expect(insertedFreight).toEqual(
      expect.objectContaining({
        amount_received: payload.amountReceived,
        payment_due_date: payload.paymentDueDate,
      }),
    );
    expect(sharedMocks.toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Frete iniciado" }),
    );
    expect(result).toHaveProperty("freightId");
    unmount();
  });

  it("addFreight online segundo frete (planned) mostra notice", async () => {
    // Existing in_progress freight → next will be planned → notice
    const { app, unmount } = await renderApp();
    await app.addFreight("trip-1", freightPayload());

    // freightFeedback for planned is a notice
    expect(sharedMocks.toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Próximo frete adicionado" }),
    );
    unmount();
  });

  it("addFreight com erro do Supabase lança exceção", async () => {
    dbErrors.freights_insert = "Erro ao inserir frete";

    const { app, unmount } = await renderApp();
    await expect(app.addFreight("trip-1", freightPayload())).rejects.toThrow(
      "Erro ao inserir frete",
    );
    unmount();
  });

  // ─── deleteFreight ────────────────────────────────────────────────────────

  it("deleteFreight offline enfileira e mostra toast", async () => {
    const { app, unmount } = await renderApp();
    offlineState.online = false;

    await app.deleteFreight("trip-1", "freight-in-progress");

    expect(offlineState.queue).toHaveLength(1);
    expect(offlineState.queue[0].type).toBe("deleteFreight");
    expect(sharedMocks.toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Frete excluído" }),
    );
    unmount();
  });

  it("deleteFreight frete planned exibe notice específico", async () => {
    dbState.freights = [
      {
        id: "planned-freight",
        user_id: "user-1",
        trip_id: "trip-1",
        origin: "A",
        destination: "B",
        km_initial: 200,
        km_final: 0,
        gross_value: 500,
        commission_percent: 10,
        commission_value: 50,
        status: "planned",
        estimated_distance: 100,
        created_at: now,
      },
    ];

    const { app, unmount } = await renderApp();
    await app.deleteFreight("trip-1", "planned-freight");

    expect(sharedMocks.toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Próximo frete excluído" }),
    );
    unmount();
  });

  it("deleteFreight frete completed exibe notice específico", async () => {
    dbState.freights = [
      {
        id: "completed-freight",
        user_id: "user-1",
        trip_id: "trip-1",
        origin: "A",
        destination: "B",
        km_initial: 200,
        km_final: 400,
        gross_value: 500,
        commission_percent: 10,
        commission_value: 50,
        status: "completed",
        estimated_distance: 200,
        created_at: now,
      },
    ];

    const { app, unmount } = await renderApp();
    await app.deleteFreight("trip-1", "completed-freight");

    expect(sharedMocks.toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Frete concluído excluído" }),
    );
    unmount();
  });

  it("deleteFreight frete in_progress exibe notice de frete em andamento", async () => {
    const { app, unmount } = await renderApp();
    await app.deleteFreight("trip-1", "freight-in-progress");

    expect(sharedMocks.toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Frete em andamento excluído" }),
    );
    unmount();
  });

  // ─── startFreight ─────────────────────────────────────────────────────────

  it("startFreight com frete ativo existente retorna blocked_active_freight", async () => {
    // Add a second planned freight
    dbState.freights.push({
      id: "planned-2",
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

    const { app, unmount } = await renderApp();
    const result = await app.startFreight("trip-1", "planned-2");

    expect(result.status).toBe("blocked_active_freight");
    expect(result.activeFreightId).toBe("freight-in-progress");
    unmount();
  });

  it("startFreight offline enfileira e retorna started", async () => {
    dbState.freights = [
      {
        id: "planned-only",
        user_id: "user-1",
        trip_id: "trip-1",
        origin: "A",
        destination: "B",
        km_initial: 100,
        km_final: 0,
        gross_value: 1000,
        commission_percent: 10,
        commission_value: 100,
        status: "planned",
        estimated_distance: 0,
        created_at: now,
      },
    ];

    const { app, unmount } = await renderApp();
    offlineState.online = false;

    const result = await app.startFreight("trip-1", "planned-only");

    expect(result.status).toBe("started");
    expect(offlineState.queue[0].type).toBe("startFreight");
    unmount();
  });

  it("startFreight online inicia o frete e retorna started", async () => {
    dbState.freights = [
      {
        id: "planned-only",
        user_id: "user-1",
        trip_id: "trip-1",
        origin: "A",
        destination: "B",
        km_initial: 100,
        km_final: 0,
        gross_value: 1000,
        commission_percent: 10,
        commission_value: 100,
        status: "planned",
        estimated_distance: 0,
        created_at: now,
      },
    ];

    const { app, unmount } = await renderApp();
    const result = await app.startFreight("trip-1", "planned-only");

    expect(result.status).toBe("started");
    const freight = dbState.freights.find((f) => f.id === "planned-only");
    expect(freight?.status).toBe("in_progress");
    unmount();
  });

  // ─── completeFreight ──────────────────────────────────────────────────────

  it("completeFreight offline enfileira e retorna promotedFreightId null", async () => {
    const { app, unmount } = await renderApp();
    offlineState.online = false;

    const result = await app.completeFreight("trip-1", "freight-in-progress");

    expect(result.promotedFreightId).toBeNull();
    expect(offlineState.queue[0].type).toBe("completeFreight");
    unmount();
  });

  it("completeFreight complete_only marca como completed sem promover próximo", async () => {
    const { app, unmount } = await renderApp();
    await app.completeFreight("trip-1", "freight-in-progress", "complete_only");

    const freight = dbState.freights.find((f) => f.id === "freight-in-progress");
    expect(freight?.status).toBe("completed");
    unmount();
  });

  it("completeFreight start_next_if_planned promove próximo planned para in_progress", async () => {
    dbState.freights.push({
      id: "next-planned",
      user_id: "user-1",
      trip_id: "trip-1",
      origin: "B",
      destination: "C",
      km_initial: 300,
      km_final: 0,
      gross_value: 800,
      commission_percent: 10,
      commission_value: 80,
      status: "planned",
      estimated_distance: 100,
      created_at: "2026-03-22T11:00:00.000Z",
    });

    const { app, unmount } = await renderApp();
    const result = await app.completeFreight(
      "trip-1",
      "freight-in-progress",
      "start_next_if_planned",
    );

    const nextFreight = dbState.freights.find((f) => f.id === "next-planned");
    expect(nextFreight?.status).toBe("in_progress");
    expect(result.promotedFreightId).toBe("next-planned");
    unmount();
  });

  it("completeFreight start_next_if_planned sem próximo retorna promotedFreightId null", async () => {
    // Only in_progress, no planned
    const { app, unmount } = await renderApp();
    const result = await app.completeFreight(
      "trip-1",
      "freight-in-progress",
      "start_next_if_planned",
    );

    expect(result.promotedFreightId).toBeNull();
    unmount();
  });

  // ─── updateFreight ────────────────────────────────────────────────────────

  it("updateFreight com validação inválida retorna blocked", async () => {
    fieldValidationMocks.validatePositiveNumber.mockReturnValueOnce({
      isValid: false,
      message: "KM inválido",
    });

    const { app, unmount } = await renderApp();
    const result = await app.updateFreight("trip-1", "freight-in-progress", freightPayload());

    expect(result.status).toBe("blocked");
    unmount();
  });

  it("updateFreight offline enfileira e retorna updated", async () => {
    const { app, unmount } = await renderApp();
    offlineState.online = false;
    const payload = {
      ...freightPayload(),
      amountReceived: 180,
      paymentDueDate: "2026-05-05",
      receivablePlanType: "advance_percent" as const,
    };

    const result = await app.updateFreight("trip-1", "freight-in-progress", payload);

    expect(result.status).toBe("updated");
    expect(offlineState.queue[0].type).toBe("updateFreight");
    expect(offlineState.queue[0].payload).toEqual(
      expect.objectContaining({
        amount_received: payload.amountReceived,
        payment_due_date: payload.paymentDueDate,
        receivable_plan_type: payload.receivablePlanType,
      }),
    );
    unmount();
  });

  it("updateFreight parcial preserva metadata de recebíveis já salva", async () => {
    const { app, unmount } = await renderApp();

    const result = await app.updateFreight("trip-1", "freight-in-progress", {
      origin: "Origem Atualizada",
      destination: "Destino Atualizado",
      kmInitial: 150,
      grossValue: 2200,
      commissionPercent: 12,
      amountReceived: 350,
      paymentDueDate: "2026-04-20",
    });

    expect(result.status).toBe("route_refreshed");
    const updated = dbState.freights.find((f) => f.id === "freight-in-progress");
    expect(updated).toEqual(
      expect.objectContaining({
        receivable_mode: "complete",
        advance_amount: 250,
        payer_name: "Pagador Original",
        delivery_proof_status: "pending_send",
        balance_release_mode: "proof_photo",
        balance_adjustments: [{ type: "discount", amount: 50 }],
      }),
    );
    unmount();
  });

  it("updateFreight com valor recebido inválido retorna blocked", async () => {
    const { app, unmount } = await renderApp();

    const result = await app.updateFreight("trip-1", "freight-in-progress", {
      ...freightPayload(),
      amountReceived: -10,
    });

    expect(result.status).toBe("blocked");
    expect(result.userMessage).toMatch(/Valor recebido inválido/);

    unmount();
  });

  it("updateFreight com vencimento inválido retorna blocked", async () => {
    const { app, unmount } = await renderApp();

    const result = await app.updateFreight("trip-1", "freight-in-progress", {
      ...freightPayload(),
      paymentDueDate: "08/04/2026",
    });

    expect(result.status).toBe("blocked");
    expect(result.userMessage).toMatch(/Previsão de pagamento inválida/);

    unmount();
  });

  it("updateFreight com vencimento impossível retorna blocked", async () => {
    const { app, unmount } = await renderApp();

    const result = await app.updateFreight("trip-1", "freight-in-progress", {
      ...freightPayload(),
      paymentDueDate: "2026-02-30",
    });

    expect(result.status).toBe("blocked");
    expect(result.userMessage).toMatch(/data existente/);

    unmount();
  });

  it("updateFreight descarta balanceAdjustments com amount vazio e emite warning dev-only", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { app, unmount } = await renderApp();

    const result = await app.updateFreight(
      "trip-1",
      "freight-in-progress",
      {
        ...freightPayload(),
        balanceAdjustments: [
          { type: "discount", amount: 40, note: "desconto válido" },
          { type: "increase", amount: "", note: "valor vazio" },
          { type: "discount", amount: null, note: "valor ausente" },
        ],
      } as unknown as ReturnType<typeof freightPayload>,
    );

    expect(result.status).toBe("route_refreshed");
    const updated = dbState.freights.find((f) => f.id === "freight-in-progress");
    expect(updated?.balance_adjustments).toEqual([
      { type: "discount", amount: 40, note: "desconto válido" },
    ]);
    expect(warnSpy).toHaveBeenCalledWith(
      "[freight-receivable] balanceAdjustments inválidos foram descartados durante a normalização.",
      expect.objectContaining({
        accepted: [{ type: "discount", amount: 40, note: "desconto válido" }],
      }),
    );

    warnSpy.mockRestore();
    unmount();
  });

  it("updateFreight com frete completed e KM alterado retorna blocked", async () => {
    // current freight is completed with km_initial=100, trying to change to 200
    dbState.freights = [
      {
        id: "completed-freight",
        user_id: "user-1",
        trip_id: "trip-1",
        origin: "A",
        destination: "B",
        km_initial: 100,
        km_final: 400,
        gross_value: 1000,
        commission_percent: 10,
        commission_value: 100,
        status: "completed",
        estimated_distance: 200,
        created_at: now,
      },
    ];

    const { app, unmount } = await renderApp();
    const result = await app.updateFreight(
      "trip-1",
      "completed-freight",
      { ...freightPayload(), kmInitial: 200 },
    );

    expect(result.status).toBe("blocked");
    unmount();
  });

  it("updateFreight sem mudança de rota atualiza e retorna updated", async () => {
    const { app, unmount } = await renderApp();
    const payload = {
      ...freightPayload(),
      origin: "A", // same as current
      destination: "B", // same as current
      amountReceived: 750,
      paymentDueDate: "2026-06-10",
    };
    const result = await app.updateFreight("trip-1", "freight-in-progress", {
      ...payload,
    });

    expect(result.status).toBe("updated");
    const updatedFreight = dbState.freights.find((f) => f.id === "freight-in-progress");
    expect(updatedFreight).toEqual(
      expect.objectContaining({
        amount_received: payload.amountReceived,
        payment_due_date: payload.paymentDueDate,
      }),
    );
    unmount();
  });

  it("updateFreight com rota nova e rota OK retorna route_refreshed", async () => {
    const { app, unmount } = await renderApp();
    const result = await app.updateFreight("trip-1", "freight-in-progress", {
      ...freightPayload(),
      origin: "São Paulo - SP", // different from "A"
      destination: "Rio de Janeiro - RJ", // different from "B"
    });

    expect(result.status).toBe("route_refreshed");
    unmount();
  });

  it("updateFreight com rota nova que falha retorna saved_without_route", async () => {
    sharedMocks.refreshRouteDistanceCacheMock.mockResolvedValue({
      distanceKm: null,
      reason: "geocoding_failed",
      originQueryUsed: null,
      destinationQueryUsed: null,
    });

    const { app, unmount } = await renderApp();
    const result = await app.updateFreight("trip-1", "freight-in-progress", {
      ...freightPayload(),
      origin: "São Paulo - SP",
      destination: "Desconhecido",
    });

    expect(result.status).toBe("saved_without_route");
    unmount();
  });

  it("updateFreight com forceRouteRefresh=true e rota OK retorna route_refreshed", async () => {
    const { app, unmount } = await renderApp();
    const result = await app.updateFreight(
      "trip-1",
      "freight-in-progress",
      { ...freightPayload(), origin: "A", destination: "B" },
      { forceRouteRefresh: true },
    );

    expect(result.status).toBe("route_refreshed");
    unmount();
  });

  it("updateFreight com suppressSuccessToast=true não exibe toast de sucesso", async () => {
    const { app, unmount } = await renderApp();
    await app.updateFreight(
      "trip-1",
      "freight-in-progress",
      { ...freightPayload(), origin: "A", destination: "B" },
      { suppressSuccessToast: true },
    );

    // Toast with "Frete atualizado" should NOT be called
    const successCalls = sharedMocks.toastMock.mock.calls.filter(
      (call) => call[0]?.title === "Frete atualizado",
    );
    expect(successCalls).toHaveLength(0);
    unmount();
  });

  it("updateFreight com erro ao carregar currentFreight lança exceção", async () => {
    dbErrors.freights_select = "Erro ao carregar frete";

    const { app, unmount } = await renderApp();
    await expect(
      app.updateFreight("trip-1", "freight-in-progress", freightPayload()),
    ).rejects.toThrow("Erro ao carregar frete");
    unmount();
  });

  it("updateFreight com KM incoerente lança exceção", async () => {
    fieldValidationMocks.validateKmByContext.mockReturnValueOnce({
      isValid: false,
      message: "KM abaixo do mínimo",
      warnings: [],
    });

    const { app, unmount } = await renderApp();
    await expect(
      app.updateFreight("trip-1", "freight-in-progress", freightPayload()),
    ).rejects.toThrow("KM abaixo do mínimo");
    unmount();
  });
});
