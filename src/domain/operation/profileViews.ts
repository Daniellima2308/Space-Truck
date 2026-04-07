import type { Trip, Vehicle, VehicleOperationProfile } from "@/types";
import { getTripFinancialSummary } from "@/domain/operation/financialSummaries";

export interface ProfileView {
  profile: VehicleOperationProfile;
  primaryLabel: string;
  primaryValue: number;
  secondaryLabel: string;
  secondaryValue: number;
}

function buildDriverOwnerView(trip: Trip): ProfileView {
  const financial = getTripFinancialSummary(trip);
  return {
    profile: "driver_owner",
    primaryLabel: "Líquido da viagem",
    primaryValue: financial.netRevenue,
    secondaryLabel: "Custos operacionais",
    secondaryValue: financial.totalExpenses,
  };
}

function buildCommissionedDriverView(trip: Trip): ProfileView {
  const financial = getTripFinancialSummary(trip);
  return {
    profile: "commissioned_driver",
    primaryLabel: "Comissão gerada",
    primaryValue: financial.totalCommissions,
    secondaryLabel: "Bruto embarcado",
    secondaryValue: financial.grossRevenue,
  };
}

function buildOwnerWithDriverView(trip: Trip): ProfileView {
  const financial = getTripFinancialSummary(trip);
  return {
    profile: "owner_with_driver",
    primaryLabel: "Resultado do caminhão",
    primaryValue: financial.netRevenue + financial.totalPersonalExpenses,
    secondaryLabel: "Comissão do motorista",
    secondaryValue: financial.totalCommissions,
  };
}

function buildCustomView(trip: Trip): ProfileView {
  const financial = getTripFinancialSummary(trip);
  return {
    profile: "custom",
    primaryLabel: "Resultado líquido",
    primaryValue: financial.netRevenue,
    secondaryLabel: "Bruto",
    secondaryValue: financial.grossRevenue,
  };
}

export function getTripProfileView(vehicle: Vehicle, trip: Trip): ProfileView {
  switch (vehicle.operationProfile) {
    case "driver_owner":
      return buildDriverOwnerView(trip);
    case "commissioned_driver":
      return buildCommissionedDriverView(trip);
    case "owner_with_driver":
      return buildOwnerWithDriverView(trip);
    case "custom":
    default:
      return buildCustomView(trip);
  }
}
