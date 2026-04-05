import { Trip } from "@/types";

/**
 * Returns the number of calendar days since the trip was created.
 * Uses UTC timestamps for consistency across timezones.
 */
export function getTripAgeDays(trip: Trip): number {
  return Math.floor(
    (Date.now() - new Date(trip.createdAt).getTime()) / (1000 * 60 * 60 * 24),
  );
}

/**
 * Returns true when all freights in the trip are completed and there is at
 * least one freight — meaning the trip is ready to be finalized.
 */
export function isTripReadyToFinish(trip: Trip): boolean {
  return trip.freights.length > 0 && trip.freights.every((f) => f.status === "completed");
}
