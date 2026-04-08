import type { Trip, Vehicle } from "@/types";
import {
  getTripFinancialSummary,
} from "@/domain/operation/financialSummaries";
import { getTripOperationalSummary } from "@/domain/operation/tripSummaries";

export interface VehicleSummary {
  vehicle: Vehicle;
  trips: Trip[];
  activeTrips: Trip[];
  finishedTrips: Trip[];
  totalGrossRevenue: number;
  totalNetRevenue: number;
  totalExpenses: number;
  totalCommissions: number;
  currentTripOperational?: ReturnType<typeof getTripOperationalSummary>;
}

export function getTripsByVehicle(vehicleId: string, trips: Trip[]): Trip[] {
  return trips.filter((trip) => trip.vehicleId === vehicleId);
}

export function getVehicleSummary(vehicle: Vehicle, trips: Trip[]): VehicleSummary {
  const vehicleTrips = getTripsByVehicle(vehicle.id, trips);
  const activeTrips = vehicleTrips.filter((trip) => trip.status === "open");
  const finishedTrips = vehicleTrips.filter((trip) => trip.status === "finished");
  const currentTrip = activeTrips.reduce<Trip | undefined>((latest, trip) => {
    if (!latest) return trip;
    return new Date(trip.createdAt).getTime() > new Date(latest.createdAt).getTime() ? trip : latest;
  }, undefined);

  const aggregates = vehicleTrips.reduce(
    (acc, trip) => {
      const financial = getTripFinancialSummary(trip);
      acc.totalGrossRevenue += financial.grossRevenue;
      acc.totalNetRevenue += financial.netRevenue;
      acc.totalExpenses += financial.totalExpenses;
      acc.totalCommissions += financial.totalCommissions;
      return acc;
    },
    {
      totalGrossRevenue: 0,
      totalNetRevenue: 0,
      totalExpenses: 0,
      totalCommissions: 0,
    },
  );

  const currentTripOperational = currentTrip
    ? getTripOperationalSummary(currentTrip)
    : undefined;

  return {
    vehicle,
    trips: vehicleTrips,
    activeTrips,
    finishedTrips,
    currentTripOperational,
    ...aggregates,
  };
}
