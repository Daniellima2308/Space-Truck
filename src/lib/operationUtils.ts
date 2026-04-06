import { Trip } from "@/types";

/**
 * Returns the number of calendar days since the trip was created.
 * Uses UTC timestamps for consistency across timezones.
 */
export function getTripAgeDays(trip: Trip): number {
  const createdAt = new Date(trip.createdAt);
  const now = new Date();

  const createdAtUtcMidnight = Date.UTC(
    createdAt.getUTCFullYear(),
    createdAt.getUTCMonth(),
    createdAt.getUTCDate(),
  );
  const nowUtcMidnight = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );

  return Math.max(
    0,
    Math.floor((nowUtcMidnight - createdAtUtcMidnight) / (1000 * 60 * 60 * 24)),
  );
}

/**
 * Returns true when all freights in the trip are completed and there is at
 * least one freight — meaning the trip is ready to be finalized.
 */
export function isTripReadyToFinish(trip: Trip): boolean {
  return trip.freights.length > 0 && trip.freights.every((f) => f.status === "completed");
}
