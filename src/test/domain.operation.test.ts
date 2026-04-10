import { describe, expect, it } from "vitest";
import type { Trip, Vehicle } from "@/types";
import {
  getOperationSignalsV1,
  getTripFinancialSummary,
  getTripOperationalSummary,
  getTripProfileView,
  getVehicleSummary,
} from "@/domain/operation";

const vehicle: Vehicle = {
  id: "vehicle-1",
  brand: "Volvo",
  model: "FH",
  year: 2024,
  plate: "ABC1D23",
  operationProfile: "driver_owner",
  currentKm: 2400,
};

const baseTrip: Trip = {
  id: "trip-1",
  vehicleId: "vehicle-1",
  status: "open",
  createdAt: "2026-03-18T00:00:00.000Z",
  estimatedDistance: 4177,
  fuelings: [
    {
      id: "fueling-1",
      tripId: "trip-1",
      stationName: "Posto 1",
      totalValue: 900,
      liters: 300,
      kmCurrent: 2138,
      pricePerLiter: 3,
      average: 0,
      fullTank: true,
      date: "2026-03-18",
    },
  ],
  expenses: [
    {
      id: "expense-1",
      tripId: "trip-1",
      category: "pedagio",
      description: "Pedágio",
      value: 200,
      date: "2026-03-18",
    },
  ],
  personalExpenses: [
    {
      id: "personal-1",
      tripId: "trip-1",
      category: "almoco_janta",
      description: "Almoço",
      value: 50,
      date: "2026-03-18",
    },
  ],
  freights: [
    {
      id: "freight-1",
      tripId: "trip-1",
      origin: "Campinas",
      destination: "Curitiba",
      kmInitial: 1000,
      grossValue: 2000,
      commissionPercent: 10,
      commissionValue: 200,
      status: "in_progress",
      estimatedDistance: 1138,
      createdAt: "2026-03-18T00:00:00.000Z",
    amountReceived: 0,
    },
    {
      id: "freight-2",
      tripId: "trip-1",
      origin: "Curitiba",
      destination: "Porto Alegre",
      kmInitial: 0,
      grossValue: 5000,
      commissionPercent: 10,
      commissionValue: 500,
      status: "planned",
      estimatedDistance: 3039,
      createdAt: "2026-03-18T00:00:00.000Z",
    amountReceived: 0,
    },
  ],
};

describe("domain operation summaries", () => {
  it("gera resumo financeiro da viagem", () => {
    const summary = getTripFinancialSummary(baseTrip);

    expect(summary.grossRevenue).toBe(7000);
    expect(summary.grossRevenueToDate).toBe(2000);
    expect(summary.totalCommissions).toBe(700);
    expect(summary.totalCommissionsToDate).toBe(200);
    expect(summary.totalExpenses).toBe(1100);
    expect(summary.totalPersonalExpenses).toBe(50);
    expect(summary.netRevenue).toBe(5150);
    expect(summary.netRevenueToDate).toBe(650);
  });

  it("gera resumo operacional da viagem", () => {
    const summary = getTripOperationalSummary(baseTrip);

    expect(summary.kmBasisToDate).toEqual({ km: 1138, source: "actual" });
    expect(summary.kmBasisTotal).toEqual({ km: 4177, source: "estimated" });
    expect(summary.costPerKmToDate).toBe(1.14);
    expect(summary.profitPerKmToDate).toBe(0.57);
  });

  it("gera sinais operacionais iniciais", () => {
    const signals = getOperationSignalsV1(baseTrip);

    expect(signals.hasCoreData).toBe(true);
    expect(signals.hasOperationalFreight).toBe(true);
    expect(signals.hasPlannedFreight).toBe(true);
    expect(signals.hasRealKm).toBe(true);
    expect(signals.canFinishTrip).toBe(false);
  });

  it("gera leitura por perfil operacional", () => {
    const ownerView = getTripProfileView(vehicle, baseTrip);
    expect(ownerView.profile).toBe("driver_owner");
    expect(ownerView.primaryLabel).toBe("Líquido da viagem");
    expect(ownerView.primaryValue).toBe(5150);

    const commissionedVehicle: Vehicle = {
      ...vehicle,
      operationProfile: "commissioned_driver",
    };
    const commissionedView = getTripProfileView(commissionedVehicle, baseTrip);
    expect(commissionedView.profile).toBe("commissioned_driver");
    expect(commissionedView.primaryLabel).toBe("Comissão gerada");
    expect(commissionedView.primaryValue).toBe(700);

    const ownerWithDriverVehicle: Vehicle = {
      ...vehicle,
      operationProfile: "owner_with_driver",
    };
    const ownerWithDriverView = getTripProfileView(ownerWithDriverVehicle, baseTrip);
    expect(ownerWithDriverView.profile).toBe("owner_with_driver");
    expect(ownerWithDriverView.primaryLabel).toBe("Resultado do caminhão");
    expect(ownerWithDriverView.primaryValue).toBe(5200);

    const customVehicle: Vehicle = {
      ...vehicle,
      operationProfile: "custom",
    };
    const customView = getTripProfileView(customVehicle, baseTrip);
    expect(customView.profile).toBe("custom");
    expect(customView.primaryLabel).toBe("Resultado líquido");
    expect(customView.primaryValue).toBe(5150);

    const unknownProfileVehicle = {
      ...vehicle,
      operationProfile: "unknown_profile" as unknown,
    } as Vehicle;
    const defaultView = getTripProfileView(unknownProfileVehicle, baseTrip);
    expect(defaultView.profile).toBe("custom");
    expect(defaultView.primaryLabel).toBe("Resultado líquido");
    expect(defaultView.primaryValue).toBe(5150);
  });

  it("gera leitura consolidada do veículo", () => {
    const finishedTrip: Trip = {
      ...baseTrip,
      id: "trip-2",
      status: "finished",
      estimatedDistance: 1400,
      fuelings: baseTrip.fuelings.map((fueling) => ({ ...fueling, tripId: "trip-2" })),
      expenses: baseTrip.expenses.map((expense) => ({ ...expense, tripId: "trip-2" })),
      personalExpenses: baseTrip.personalExpenses.map((expense) => ({ ...expense, tripId: "trip-2" })),
      freights: [
        { ...baseTrip.freights[0], tripId: "trip-2", status: "completed" },
        { ...baseTrip.freights[1], tripId: "trip-2" },
      ],
    };

    const vehicleSummary = getVehicleSummary(vehicle, [baseTrip, finishedTrip]);

    expect(vehicleSummary.activeTrips).toHaveLength(1);
    expect(vehicleSummary.finishedTrips).toHaveLength(1);
    expect(vehicleSummary.totalGrossRevenue).toBe(9000);
    expect(vehicleSummary.totalCommissions).toBe(900);
    expect(vehicleSummary.totalExpenses).toBe(2200);
    expect(vehicleSummary.totalNetRevenue).toBe(5800);
    expect(vehicleSummary.currentTripOperational?.kmBasisToDate).toEqual({ km: 1138, source: "actual" });
  });
});
