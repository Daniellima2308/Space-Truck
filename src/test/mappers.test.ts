import { describe, expect, it } from "vitest";
import {
  mapVehicleRow,
  mapFreightRow,
  mapFuelingRow,
  mapExpenseRow,
  mapPersonalExpenseRow,
  mapMaintenanceServiceRow,
  buildFreightsMap,
  buildFuelingsMap,
  buildExpensesMap,
  buildPersonalExpensesMap,
  buildTripsFromRows,
} from "@/lib/mappers";
import type {
  VehicleRow,
  FreightRow,
  FuelingRow,
  ExpenseRow,
  PersonalExpenseRow,
  MaintenanceServiceRow,
  TripRow,
} from "@/lib/mappers";

// ---------------------------------------------------------------------------
// mapVehicleRow
// ---------------------------------------------------------------------------

describe("mapVehicleRow", () => {
  const base: VehicleRow = {
    id: "v1",
    brand: "Volvo",
    model: "FH",
    year: 2020,
    plate: "ABC-1234",
    is_fleet_owner: true,
    driver_name: "João",
    current_km: 150000,
    operation_profile: "driver_owner",
    driver_bond: "autonomo",
    default_commission_percent: 10,
  };

  it("mapeia campos básicos corretamente", () => {
    const vehicle = mapVehicleRow(base);
    expect(vehicle.id).toBe("v1");
    expect(vehicle.brand).toBe("Volvo");
    expect(vehicle.model).toBe("FH");
    expect(vehicle.year).toBe(2020);
    expect(vehicle.plate).toBe("ABC-1234");
    expect(vehicle.currentKm).toBe(150000);
  });

  it("converte is_fleet_owner para isFleetOwner", () => {
    expect(mapVehicleRow(base).isFleetOwner).toBe(true);
    expect(mapVehicleRow({ ...base, is_fleet_owner: false }).isFleetOwner).toBe(false);
    expect(mapVehicleRow({ ...base, is_fleet_owner: null }).isFleetOwner).toBeNull();
  });

  it("converte driver_name para driverName", () => {
    expect(mapVehicleRow(base).driverName).toBe("João");
    expect(mapVehicleRow({ ...base, driver_name: null }).driverName).toBeNull();
  });

  it("usa 0 quando current_km é null", () => {
    expect(mapVehicleRow({ ...base, current_km: null }).currentKm).toBe(0);
  });

  it("usa driver_owner como padrão quando operation_profile é inválido", () => {
    expect(mapVehicleRow({ ...base, operation_profile: null }).operationProfile).toBe("driver_owner");
    expect(mapVehicleRow({ ...base, operation_profile: "invalid" }).operationProfile).toBe("driver_owner");
  });

  it("preserva operation_profile válido", () => {
    expect(mapVehicleRow({ ...base, operation_profile: "owner_with_driver" }).operationProfile).toBe("owner_with_driver");
    expect(mapVehicleRow({ ...base, operation_profile: "commissioned_driver" }).operationProfile).toBe("commissioned_driver");
  });

  it("mapeia driver_bond válido e retorna undefined para inválido", () => {
    expect(mapVehicleRow(base).driverBond).toBe("autonomo");
    expect(mapVehicleRow({ ...base, driver_bond: null }).driverBond).toBeUndefined();
    expect(mapVehicleRow({ ...base, driver_bond: "invalid" }).driverBond).toBeUndefined();
  });

  it("mapeia default_commission_percent e retorna undefined quando null", () => {
    expect(mapVehicleRow(base).defaultCommissionPercent).toBe(10);
    expect(mapVehicleRow({ ...base, default_commission_percent: null }).defaultCommissionPercent).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// mapFreightRow
// ---------------------------------------------------------------------------

describe("mapFreightRow", () => {
  const base: FreightRow = {
    id: "f1",
    trip_id: "trip-1",
    origin: "São Paulo",
    destination: "Rio de Janeiro",
    km_initial: 1000,
    gross_value: 5000,
    commission_percent: 10,
    commission_value: 500,
    status: "planned",
    estimated_distance: 430,
    created_at: "2026-01-01T10:00:00.000Z",
  };

  it("mapeia todos os campos corretamente", () => {
    const freight = mapFreightRow(base);
    expect(freight.id).toBe("f1");
    expect(freight.tripId).toBe("trip-1");
    expect(freight.origin).toBe("São Paulo");
    expect(freight.destination).toBe("Rio de Janeiro");
    expect(freight.kmInitial).toBe(1000);
    expect(freight.grossValue).toBe(5000);
    expect(freight.commissionPercent).toBe(10);
    expect(freight.commissionValue).toBe(500);
    expect(freight.status).toBe("planned");
    expect(freight.estimatedDistance).toBe(430);
    expect(freight.createdAt).toBe("2026-01-01T10:00:00.000Z");
  });

  it("usa 'planned' como padrão quando status é null", () => {
    expect(mapFreightRow({ ...base, status: null }).status).toBe("planned");
  });

  it("usa 'planned' como padrão quando status é desconhecido", () => {
    expect(mapFreightRow({ ...base, status: "unknown_status" }).status).toBe("planned");
  });

  it("usa 0 como padrão quando estimated_distance é null", () => {
    expect(mapFreightRow({ ...base, estimated_distance: null }).estimatedDistance).toBe(0);
  });

  it("preserva status 'in_progress' e 'completed'", () => {
    expect(mapFreightRow({ ...base, status: "in_progress" }).status).toBe("in_progress");
    expect(mapFreightRow({ ...base, status: "completed" }).status).toBe("completed");
  });
});

// ---------------------------------------------------------------------------
// mapFuelingRow
// ---------------------------------------------------------------------------

describe("mapFuelingRow", () => {
  const base: FuelingRow = {
    id: "fuel-1",
    trip_id: "trip-1",
    station: "Posto BR",
    total_value: 500,
    liters: 100,
    price_per_liter: 5,
    km_current: 120000,
    full_tank: true,
    average: 6.5,
    date: "2026-01-01",
    receipt_url: "https://example.com/receipt.jpg",
    allocated_value: null,
    original_total_value: null,
  };

  it("mapeia todos os campos corretamente", () => {
    const fueling = mapFuelingRow(base);
    expect(fueling.id).toBe("fuel-1");
    expect(fueling.tripId).toBe("trip-1");
    expect(fueling.stationName).toBe("Posto BR");
    expect(fueling.totalValue).toBe(500);
    expect(fueling.liters).toBe(100);
    expect(fueling.pricePerLiter).toBe(5);
    expect(fueling.kmCurrent).toBe(120000);
    expect(fueling.fullTank).toBe(true);
    expect(fueling.average).toBe(6.5);
    expect(fueling.date).toBe("2026-01-01");
    expect(fueling.receiptUrl).toBe("https://example.com/receipt.jpg");
    expect(fueling.allocatedValue).toBeUndefined();
    expect(fueling.originalTotalValue).toBeUndefined();
  });

  it("usa true como padrão quando full_tank é null", () => {
    expect(mapFuelingRow({ ...base, full_tank: null }).fullTank).toBe(true);
  });

  it("preserva full_tank false", () => {
    expect(mapFuelingRow({ ...base, full_tank: false }).fullTank).toBe(false);
  });

  it("converte receipt_url null para undefined", () => {
    expect(mapFuelingRow({ ...base, receipt_url: null }).receiptUrl).toBeUndefined();
  });

  it("mapeia allocated_value e original_total_value quando presentes", () => {
    const fueling = mapFuelingRow({ ...base, allocated_value: 300, original_total_value: 500 });
    expect(fueling.allocatedValue).toBe(300);
    expect(fueling.originalTotalValue).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// mapExpenseRow
// ---------------------------------------------------------------------------

describe("mapExpenseRow", () => {
  const base: ExpenseRow = {
    id: "exp-1",
    trip_id: "trip-1",
    category: "pedagio",
    description: "Pedágio SP-RJ",
    value: 75.5,
    date: "2026-01-01",
    receipt_url: null,
  };

  it("mapeia todos os campos corretamente", () => {
    const expense = mapExpenseRow(base);
    expect(expense.id).toBe("exp-1");
    expect(expense.tripId).toBe("trip-1");
    expect(expense.category).toBe("pedagio");
    expect(expense.description).toBe("Pedágio SP-RJ");
    expect(expense.value).toBe(75.5);
    expect(expense.date).toBe("2026-01-01");
    expect(expense.receiptUrl).toBeUndefined();
  });

  it("mapeia receipt_url quando presente", () => {
    const url = "https://example.com/receipt.jpg";
    expect(mapExpenseRow({ ...base, receipt_url: url }).receiptUrl).toBe(url);
  });

  it("usa 'outros' como padrão quando category é desconhecida", () => {
    expect(mapExpenseRow({ ...base, category: "categoria_invalida" }).category).toBe("outros");
  });
});

// ---------------------------------------------------------------------------
// mapPersonalExpenseRow
// ---------------------------------------------------------------------------

describe("mapPersonalExpenseRow", () => {
  const base: PersonalExpenseRow = {
    id: "pe-1",
    trip_id: "trip-1",
    category: "almoco_janta",
    description: "Almoço na estrada",
    value: 35,
    date: "2026-01-01",
  };

  it("mapeia todos os campos corretamente", () => {
    const pe = mapPersonalExpenseRow(base);
    expect(pe.id).toBe("pe-1");
    expect(pe.tripId).toBe("trip-1");
    expect(pe.category).toBe("almoco_janta");
    expect(pe.description).toBe("Almoço na estrada");
    expect(pe.value).toBe(35);
    expect(pe.date).toBe("2026-01-01");
  });

  it("usa 'outros' como padrão quando category é desconhecida", () => {
    expect(mapPersonalExpenseRow({ ...base, category: "categoria_invalida" }).category).toBe("outros");
  });
});

// ---------------------------------------------------------------------------
// mapMaintenanceServiceRow
// ---------------------------------------------------------------------------

describe("mapMaintenanceServiceRow", () => {
  const base: MaintenanceServiceRow = {
    id: "maint-1",
    vehicle_id: "v1",
    service_name: "Troca de óleo",
    last_change_km: 100000,
    interval_km: 10000,
    created_at: "2026-01-01T10:00:00.000Z",
  };

  it("mapeia todos os campos corretamente", () => {
    const service = mapMaintenanceServiceRow(base);
    expect(service.id).toBe("maint-1");
    expect(service.vehicleId).toBe("v1");
    expect(service.serviceName).toBe("Troca de óleo");
    expect(service.lastChangeKm).toBe(100000);
    expect(service.intervalKm).toBe(10000);
    expect(service.createdAt).toBe("2026-01-01T10:00:00.000Z");
  });
});

// ---------------------------------------------------------------------------
// buildFreightsMap
// ---------------------------------------------------------------------------

describe("buildFreightsMap", () => {
  it("agrupa fretes por trip_id", () => {
    const rows: FreightRow[] = [
      {
        id: "f1",
        trip_id: "trip-1",
        origin: "A",
        destination: "B",
        km_initial: 100,
        gross_value: 1000,
        commission_percent: 10,
        commission_value: 100,
        status: "planned",
        estimated_distance: 200,
        created_at: "2026-01-01T10:00:00.000Z",
      },
      {
        id: "f2",
        trip_id: "trip-1",
        origin: "B",
        destination: "C",
        km_initial: 300,
        gross_value: 2000,
        commission_percent: 10,
        commission_value: 200,
        status: "in_progress",
        estimated_distance: 150,
        created_at: "2026-01-02T10:00:00.000Z",
      },
      {
        id: "f3",
        trip_id: "trip-2",
        origin: "X",
        destination: "Y",
        km_initial: 500,
        gross_value: 3000,
        commission_percent: 10,
        commission_value: 300,
        status: "completed",
        estimated_distance: 300,
        created_at: "2026-01-03T10:00:00.000Z",
      },
    ];

    const map = buildFreightsMap(rows);
    expect(map.get("trip-1")).toHaveLength(2);
    expect(map.get("trip-2")).toHaveLength(1);
    expect(map.get("trip-1")![0].id).toBe("f1");
    expect(map.get("trip-1")![1].id).toBe("f2");
    expect(map.get("trip-2")![0].id).toBe("f3");
  });

  it("retorna mapa vazio para array vazio", () => {
    expect(buildFreightsMap([]).size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// buildFuelingsMap
// ---------------------------------------------------------------------------

describe("buildFuelingsMap", () => {
  it("agrupa abastecimentos por trip_id", () => {
    const rows: FuelingRow[] = [
      {
        id: "fuel-1",
        trip_id: "trip-1",
        station: "Posto A",
        total_value: 300,
        liters: 60,
        price_per_liter: 5,
        km_current: 100000,
        full_tank: true,
        average: 0,
        date: "2026-01-01",
        receipt_url: null,
        allocated_value: null,
        original_total_value: null,
      },
      {
        id: "fuel-2",
        trip_id: "trip-2",
        station: "Posto B",
        total_value: 200,
        liters: 40,
        price_per_liter: 5,
        km_current: 200000,
        full_tank: false,
        average: 0,
        date: "2026-01-02",
        receipt_url: null,
        allocated_value: null,
        original_total_value: null,
      },
    ];

    const map = buildFuelingsMap(rows);
    expect(map.get("trip-1")).toHaveLength(1);
    expect(map.get("trip-2")).toHaveLength(1);
    expect(map.get("trip-1")![0].stationName).toBe("Posto A");
  });
});

// ---------------------------------------------------------------------------
// buildExpensesMap
// ---------------------------------------------------------------------------

describe("buildExpensesMap", () => {
  it("agrupa despesas por trip_id", () => {
    const rows: ExpenseRow[] = [
      {
        id: "e1",
        trip_id: "trip-1",
        category: "pedagio",
        description: "Pedágio",
        value: 10,
        date: "2026-01-01",
        receipt_url: null,
      },
      {
        id: "e2",
        trip_id: "trip-1",
        category: "alimentacao",
        description: "Almoço",
        value: 30,
        date: "2026-01-01",
        receipt_url: null,
      },
    ];

    const map = buildExpensesMap(rows);
    expect(map.get("trip-1")).toHaveLength(2);
    expect(map.get("trip-2")).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// buildPersonalExpensesMap
// ---------------------------------------------------------------------------

describe("buildPersonalExpensesMap", () => {
  it("agrupa gastos pessoais por trip_id", () => {
    const rows: PersonalExpenseRow[] = [
      {
        id: "pe-1",
        trip_id: "trip-1",
        category: "banho",
        description: "Banho",
        value: 15,
        date: "2026-01-01",
      },
    ];

    const map = buildPersonalExpensesMap(rows);
    expect(map.get("trip-1")).toHaveLength(1);
    expect(map.get("trip-1")![0].category).toBe("banho");
  });
});

// ---------------------------------------------------------------------------
// buildTripsFromRows
// ---------------------------------------------------------------------------

describe("buildTripsFromRows", () => {
  const tripRows: TripRow[] = [
    {
      id: "trip-1",
      vehicle_id: "v1",
      status: "open",
      created_at: "2026-01-01T08:00:00.000Z",
      finished_at: null,
      estimated_distance: 300,
    },
  ];

  const freightRow: FreightRow = {
    id: "f1",
    trip_id: "trip-1",
    origin: "SP",
    destination: "RJ",
    km_initial: 1000,
    gross_value: 4000,
    commission_percent: 10,
    commission_value: 400,
    status: "in_progress",
    estimated_distance: 430,
    created_at: "2026-01-01T09:00:00.000Z",
  };

  const fuelingRow: FuelingRow = {
    id: "fuel-1",
    trip_id: "trip-1",
    station: "Posto X",
    total_value: 500,
    liters: 100,
    price_per_liter: 5,
    km_current: 1200,
    full_tank: true,
    average: 6,
    date: "2026-01-01",
    receipt_url: null,
    allocated_value: null,
    original_total_value: null,
  };

  it("monta viagens com freights, fuelings, expenses e personalExpenses", () => {
    const freightsMap = buildFreightsMap([freightRow]);
    const fuelingsMap = buildFuelingsMap([fuelingRow]);

    const trips = buildTripsFromRows({
      tripRows,
      freightsMap,
      fuelingsMap,
      expensesMap: new Map(),
      personalExpMap: new Map(),
    });

    expect(trips).toHaveLength(1);
    expect(trips[0].id).toBe("trip-1");
    expect(trips[0].vehicleId).toBe("v1");
    expect(trips[0].status).toBe("open");
    expect(trips[0].freights).toHaveLength(1);
    expect(trips[0].fuelings).toHaveLength(1);
    expect(trips[0].expenses).toHaveLength(0);
    expect(trips[0].personalExpenses).toHaveLength(0);
    expect(trips[0].estimatedDistance).toBe(300);
    expect(trips[0].finishedAt).toBeNull();
  });

  it("usa arrays vazios quando trip não tem itens associados", () => {
    const trips = buildTripsFromRows({
      tripRows,
      freightsMap: new Map(),
      fuelingsMap: new Map(),
      expensesMap: new Map(),
      personalExpMap: new Map(),
    });

    expect(trips[0].freights).toHaveLength(0);
    expect(trips[0].fuelings).toHaveLength(0);
    expect(trips[0].expenses).toHaveLength(0);
    expect(trips[0].personalExpenses).toHaveLength(0);
  });

  it("usa 0 como padrão quando estimated_distance é null", () => {
    const trips = buildTripsFromRows({
      tripRows: [{ ...tripRows[0], estimated_distance: null }],
      freightsMap: new Map(),
      fuelingsMap: new Map(),
      expensesMap: new Map(),
      personalExpMap: new Map(),
    });

    expect(trips[0].estimatedDistance).toBe(0);
  });

  it("usa 'open' como padrão quando status é desconhecido", () => {
    const trips = buildTripsFromRows({
      tripRows: [{ ...tripRows[0], status: "invalid_status" }],
      freightsMap: new Map(),
      fuelingsMap: new Map(),
      expensesMap: new Map(),
      personalExpMap: new Map(),
    });

    expect(trips[0].status).toBe("open");
  });

  it("normaliza conflitos de in_progress via normalizeTripFreights", () => {
    const activeRow: FreightRow = {
      ...freightRow,
      id: "active-1",
      status: "in_progress",
      created_at: "2026-01-01T09:00:00.000Z",
    };
    const conflictRow: FreightRow = {
      ...freightRow,
      id: "conflict-1",
      status: "in_progress",
      created_at: "2026-01-01T10:00:00.000Z",
    };

    const freightsMap = buildFreightsMap([activeRow, conflictRow]);

    const trips = buildTripsFromRows({
      tripRows,
      freightsMap,
      fuelingsMap: new Map(),
      expensesMap: new Map(),
      personalExpMap: new Map(),
    });

    const inProgressCount = trips[0].freights.filter((f) => f.status === "in_progress").length;
    expect(inProgressCount).toBe(1);
  });

  it("ordena abastecimentos por km (sortFuelingsByTimeline)", () => {
    const fueling2: FuelingRow = {
      ...fuelingRow,
      id: "fuel-2",
      km_current: 900,
    };

    const fuelingsMap = buildFuelingsMap([fuelingRow, fueling2]);

    const trips = buildTripsFromRows({
      tripRows,
      freightsMap: new Map(),
      fuelingsMap,
      expensesMap: new Map(),
      personalExpMap: new Map(),
    });

    expect(trips[0].fuelings[0].kmCurrent).toBe(900);
    expect(trips[0].fuelings[1].kmCurrent).toBe(1200);
  });
});
