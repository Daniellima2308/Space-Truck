import { Trip } from "@/types";
import {
  getFinalizedFreights,
  getOperationalFreights,
  getPlannedFreights,
  getTripActualKmTotal,
  getTripActualKmToDate,
  getTripAverageConsumption,
  getTripCostPerKm,
  getTripCostPerKmToDate,
  getTripEstimatedKmToDate,
  getTripEstimatedKmTotal,
  getTripFinalDistanceSnapshot,
  getTripFreightEstimatedKmTotal,
  getTripGrossRevenue,
  getTripGrossRevenueToDate,
  getTripKmBasisToDate,
  getTripKmBasisTotal,
  getTripLatestCheckpointKm,
  getTripNetRevenue,
  getTripNetRevenueToDate,
  getTripProfitPerKm,
  getTripProfitPerKmToDate,
  getTripTotalCommissions,
  getTripTotalCommissionsToDate,
  getTripTotalExpenses,
  getTripTotalPersonalExpenses,
} from "@/domain/operation";

export {
  getOperationalFreights,
  getPlannedFreights,
  getTripFreightEstimatedKmTotal,
  getTripGrossRevenue,
  getTripGrossRevenueToDate,
  getTripTotalCommissions,
  getTripTotalCommissionsToDate,
  getTripTotalExpenses,
  getTripTotalPersonalExpenses,
  getTripNetRevenue,
  getTripNetRevenueToDate,
  getTripActualKmToDate,
  getTripActualKmTotal,
  getTripLatestCheckpointKm,
  getTripAverageConsumption,
  getTripEstimatedKmToDate,
  getTripKmBasisToDate,
  getTripEstimatedKmTotal,
  getTripFinalDistanceSnapshot,
  getTripKmBasisTotal,
  getTripCostPerKm,
  getTripCostPerKmToDate,
  getTripProfitPerKm,
  getTripProfitPerKmToDate,
};

export function getTripTotalKm(trip: Trip): number {
  return getTripActualKmTotal(trip);
}

export function getEffectiveKm(trip: Trip): { km: number; isEstimate: boolean } {
  const basis = trip.status === "open" ? getTripKmBasisToDate(trip) : getTripKmBasisTotal(trip);
  return { km: basis.km, isEstimate: basis.source === "estimated" };
}

export function getLastDestination(trip: Trip): string {
  const finalizedFreights = getFinalizedFreights(trip);
  if (finalizedFreights.length === 0) return "—";
  return finalizedFreights[finalizedFreights.length - 1].destination;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(value);
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("pt-BR");
}
