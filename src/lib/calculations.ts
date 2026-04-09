import { Trip } from "@/types";
import {
  getFinalizedFreights,
  getTripActualKmTotal,
  getTripKmBasisToDate,
  getTripKmBasisTotal,
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
} from "@/domain/operation";

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
  const parsedDate = parseDateLikeInput(date);
  if (!parsedDate) return "—";
  return parsedDate.toLocaleDateString("pt-BR");
}

function parseDateLikeInput(value: string): Date | null {
  if (!value) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [yearRaw, monthRaw, dayRaw] = value.split("-");
    const year = Number(yearRaw);
    const month = Number(monthRaw);
    const day = Number(dayRaw);
    const localDate = new Date(year, month - 1, day);

    if (
      localDate.getFullYear() !== year ||
      localDate.getMonth() !== month - 1 ||
      localDate.getDate() !== day
    ) {
      return null;
    }

    return localDate;
  }

  const fallbackDate = new Date(value);
  if (Number.isNaN(fallbackDate.getTime())) return null;
  return fallbackDate;
}
