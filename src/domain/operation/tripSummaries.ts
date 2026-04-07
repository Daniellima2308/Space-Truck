import type { Freight, Trip } from "@/types";
import { getWeightedTripAverageConsumption } from "@/lib/fueling";
import {
  getFinalizedFreights,
  getOperationalFreights,
  getPlannedFreights,
} from "@/domain/operation/baseSelectors";
import {
  getTripNetRevenue,
  getTripNetRevenueToDate,
  getTripTotalCommissions,
  getTripTotalCommissionsToDate,
  getTripTotalExpenses,
} from "@/domain/operation/financialSummaries";

export interface KmBasis {
  km: number;
  source: "actual" | "estimated" | "none";
}

export interface TripOperationalSummary {
  averageConsumption: number;
  freightEstimatedKmTotal: number;
  estimatedKmToDate: number;
  estimatedKmTotal: number;
  actualKmToDate: number;
  actualKmTotal: number;
  latestCheckpointKm: number;
  finalDistanceSnapshot: number;
  kmBasisToDate: KmBasis;
  kmBasisTotal: KmBasis;
  costPerKmTotal: number;
  costPerKmToDate: number;
  profitPerKmTotal: number;
  profitPerKmToDate: number;
}

export { getFinalizedFreights, getOperationalFreights, getPlannedFreights };

function getFreightEstimatedKmSum(freights: Freight[]): number {
  return freights.reduce(
    (sum, freight) => sum + (freight.estimatedDistance > 0 ? freight.estimatedDistance : 0),
    0,
  );
}

function getKmFromCheckpoints(checkpoints: number[]): number {
  const validCheckpoints = checkpoints.filter((km) => km > 0);
  if (validCheckpoints.length < 2) return 0;

  const startKm = Math.min(...validCheckpoints);
  const endKm = Math.max(...validCheckpoints);
  const total = endKm - startKm;
  return total > 0 ? total : 0;
}

export function getTripFreightEstimatedKmTotal(trip: Trip): number {
  return getFreightEstimatedKmSum(trip.freights);
}

export function getTripActualKmToDate(trip: Trip): number {
  const checkpoints = [
    ...trip.fuelings.map((f) => f.kmCurrent),
    ...getOperationalFreights(trip).map((f) => f.kmInitial),
  ];

  return getKmFromCheckpoints(checkpoints);
}

export function getTripActualKmTotal(trip: Trip): number {
  if (trip.status === "finished") {
    const finalDistanceSnapshot = getTripFinalDistanceSnapshot(trip);
    if (finalDistanceSnapshot > 0) return finalDistanceSnapshot;
  }

  return getTripActualKmToDate(trip);
}

export function getTripLatestCheckpointKm(trip: Trip): number {
  const checkpoints = [
    ...trip.fuelings.map((f) => f.kmCurrent),
    ...getOperationalFreights(trip).map((f) => f.kmInitial),
  ].filter((km) => km > 0);

  if (checkpoints.length === 0) return 0;
  return Math.max(...checkpoints);
}

export function getTripAverageConsumption(trip: Trip): number {
  return getWeightedTripAverageConsumption(
    trip.fuelings.map((fueling) => ({
      liters: fueling.liters,
      fullTank: fueling.fullTank ?? true,
      average: fueling.average,
    })),
  );
}

export function getTripEstimatedKmToDate(trip: Trip): number {
  return getOperationalFreights(trip).reduce(
    (sum, freight) => sum + (freight.estimatedDistance > 0 ? freight.estimatedDistance : 0),
    0,
  );
}

export function getTripKmBasisToDate(trip: Trip): KmBasis {
  const actual = getTripActualKmToDate(trip);
  if (actual > 0) return { km: actual, source: "actual" };

  const estimated = getTripEstimatedKmToDate(trip);
  if (estimated > 0) return { km: estimated, source: "estimated" };

  return { km: 0, source: "none" };
}

export function getTripEstimatedKmTotal(trip: Trip): number {
  const freightEstimatedTotal = getTripFreightEstimatedKmTotal(trip);

  if (trip.status === "finished") {
    return freightEstimatedTotal;
  }

  if (trip.estimatedDistance > 0) {
    return trip.estimatedDistance;
  }

  return freightEstimatedTotal;
}

export function getTripFinalDistanceSnapshot(trip: Trip): number {
  return trip.status === "finished" && trip.estimatedDistance > 0 ? trip.estimatedDistance : 0;
}

export function getTripKmBasisTotal(trip: Trip): KmBasis {
  const actual = getTripActualKmTotal(trip);
  if (trip.status === "finished" && actual > 0) return { km: actual, source: "actual" };

  const estimated = getTripEstimatedKmTotal(trip);
  if (estimated > 0) return { km: estimated, source: "estimated" };

  if (actual > 0) return { km: actual, source: "actual" };

  return { km: 0, source: "none" };
}

export function getTripCostPerKm(trip: Trip): number {
  const { km } = getTripKmBasisTotal(trip);
  if (km === 0) return 0;
  const totalCost = getTripTotalExpenses(trip) + getTripTotalCommissions(trip);
  return Math.round((totalCost / km) * 100) / 100;
}

export function getTripCostPerKmToDate(trip: Trip): number {
  const { km } = getTripKmBasisToDate(trip);
  if (km === 0) return 0;
  const totalCost = getTripTotalExpenses(trip) + getTripTotalCommissionsToDate(trip);
  return Math.round((totalCost / km) * 100) / 100;
}

export function getTripProfitPerKm(trip: Trip): number {
  const { km } = getTripKmBasisTotal(trip);
  if (km === 0) return 0;
  return Math.round((getTripNetRevenue(trip) / km) * 100) / 100;
}

export function getTripProfitPerKmToDate(trip: Trip): number {
  const { km } = getTripKmBasisToDate(trip);
  if (km === 0) return 0;
  return Math.round((getTripNetRevenueToDate(trip) / km) * 100) / 100;
}

export function getTripOperationalSummary(trip: Trip): TripOperationalSummary {
  const kmBasisToDate = getTripKmBasisToDate(trip);
  const kmBasisTotal = getTripKmBasisTotal(trip);

  return {
    averageConsumption: getTripAverageConsumption(trip),
    freightEstimatedKmTotal: getTripFreightEstimatedKmTotal(trip),
    estimatedKmToDate: getTripEstimatedKmToDate(trip),
    estimatedKmTotal: getTripEstimatedKmTotal(trip),
    actualKmToDate: getTripActualKmToDate(trip),
    actualKmTotal: getTripActualKmTotal(trip),
    latestCheckpointKm: getTripLatestCheckpointKm(trip),
    finalDistanceSnapshot: getTripFinalDistanceSnapshot(trip),
    kmBasisToDate,
    kmBasisTotal,
    costPerKmTotal: kmBasisTotal.km > 0 ? getTripCostPerKm(trip) : 0,
    costPerKmToDate: kmBasisToDate.km > 0 ? getTripCostPerKmToDate(trip) : 0,
    profitPerKmTotal: kmBasisTotal.km > 0 ? getTripProfitPerKm(trip) : 0,
    profitPerKmToDate: kmBasisToDate.km > 0 ? getTripProfitPerKmToDate(trip) : 0,
  };
}
