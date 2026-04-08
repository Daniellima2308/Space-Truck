import type { Trip } from "@/types";
import { getOperationalFreights, getPlannedFreights } from "@/domain/operation/baseSelectors";
import { getTripFinancialSummary } from "@/domain/operation/financialSummaries";
import { getTripOperationalSummary } from "@/domain/operation/tripSummaries";

export interface OperationSignalsV1 {
  hasFreight: boolean;
  hasOperationalFreight: boolean;
  hasPlannedFreight: boolean;
  hasFueling: boolean;
  hasExpenses: boolean;
  hasCoreData: boolean;
  hasRealKm: boolean;
  hasEstimatedKm: boolean;
  canFinishTrip: boolean;
  isProfitable: boolean;
}

export function getOperationSignalsV1(trip: Trip): OperationSignalsV1 {
  const operationalFreights = getOperationalFreights(trip);
  const plannedFreights = getPlannedFreights(trip);
  const operationalSummary = getTripOperationalSummary(trip);
  const financialSummary = getTripFinancialSummary(trip);
  const hasFreight = trip.freights.length > 0;
  const hasFueling = trip.fuelings.length > 0;
  const hasExpenses = trip.expenses.length > 0;

  return {
    hasFreight,
    hasOperationalFreight: operationalFreights.length > 0,
    hasPlannedFreight: plannedFreights.length > 0,
    hasFueling,
    hasExpenses,
    hasCoreData: hasFreight || hasFueling || hasExpenses,
    hasRealKm: operationalSummary.kmBasisToDate.source === "actual" && operationalSummary.kmBasisToDate.km > 0,
    hasEstimatedKm: operationalSummary.kmBasisToDate.source === "estimated" && operationalSummary.kmBasisToDate.km > 0,
    // TODO(PR3): alinhar com TripDetailPage/getCurrentFreight quando a UI migrar para estes sinais.
    // Hoje este critério usa ausência de fretes "planned", enquanto a UI ainda usa ausência de frete ativo.
    canFinishTrip: hasFreight && plannedFreights.length === 0,
    isProfitable: financialSummary.netRevenue > 0,
  };
}
