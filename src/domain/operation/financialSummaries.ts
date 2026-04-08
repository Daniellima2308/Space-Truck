import type { Trip } from "@/types";
import { getFinalizedFreights, getOperationalFreights } from "@/domain/operation/baseSelectors";

export interface TripFinancialSummary {
  grossRevenue: number;
  grossRevenueToDate: number;
  totalCommissions: number;
  totalCommissionsToDate: number;
  totalExpenses: number;
  totalPersonalExpenses: number;
  fuelingCost: number;
  otherExpenses: number;
  netRevenue: number;
  netRevenueToDate: number;
}

export function getTripGrossRevenue(trip: Trip): number {
  return getFinalizedFreights(trip).reduce((sum, freight) => sum + freight.grossValue, 0);
}

export function getTripGrossRevenueToDate(trip: Trip): number {
  return getOperationalFreights(trip).reduce((sum, freight) => sum + freight.grossValue, 0);
}

export function getTripTotalCommissions(trip: Trip): number {
  return getFinalizedFreights(trip).reduce((sum, freight) => sum + freight.commissionValue, 0);
}

export function getTripTotalCommissionsToDate(trip: Trip): number {
  return getOperationalFreights(trip).reduce((sum, freight) => sum + freight.commissionValue, 0);
}

export function getTripFuelingCost(trip: Trip): number {
  return trip.fuelings.reduce((sum, fueling) => sum + (fueling.allocatedValue ?? fueling.totalValue), 0);
}

export function getTripOtherExpenses(trip: Trip): number {
  return trip.expenses.reduce((sum, expense) => sum + expense.value, 0);
}

export function getTripTotalExpenses(trip: Trip): number {
  return getTripOtherExpenses(trip) + getTripFuelingCost(trip);
}

export function getTripTotalPersonalExpenses(trip: Trip): number {
  return (trip.personalExpenses || []).reduce((sum, expense) => sum + expense.value, 0);
}

export function getTripNetRevenue(trip: Trip): number {
  return getTripGrossRevenue(trip) - getTripTotalCommissions(trip) - getTripTotalExpenses(trip) - getTripTotalPersonalExpenses(trip);
}

export function getTripNetRevenueToDate(trip: Trip): number {
  return getTripGrossRevenueToDate(trip) - getTripTotalCommissionsToDate(trip) - getTripTotalExpenses(trip) - getTripTotalPersonalExpenses(trip);
}

export function getTripFinancialSummary(trip: Trip): TripFinancialSummary {
  const grossRevenue = getTripGrossRevenue(trip);
  const grossRevenueToDate = getTripGrossRevenueToDate(trip);
  const totalCommissions = getTripTotalCommissions(trip);
  const totalCommissionsToDate = getTripTotalCommissionsToDate(trip);
  const fuelingCost = getTripFuelingCost(trip);
  const otherExpenses = getTripOtherExpenses(trip);
  const totalExpenses = fuelingCost + otherExpenses;
  const totalPersonalExpenses = getTripTotalPersonalExpenses(trip);

  return {
    grossRevenue,
    grossRevenueToDate,
    totalCommissions,
    totalCommissionsToDate,
    fuelingCost,
    otherExpenses,
    totalExpenses,
    totalPersonalExpenses,
    netRevenue:
      grossRevenue - totalCommissions - totalExpenses - totalPersonalExpenses,
    netRevenueToDate:
      grossRevenueToDate - totalCommissionsToDate - totalExpenses - totalPersonalExpenses,
  };
}
