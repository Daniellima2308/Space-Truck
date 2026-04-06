import { Trip } from "@/types";

/**
 * Calculate the number of calendar days elapsed since the trip's creation using UTC dates.
 *
 * Computes the difference between the UTC midnight of `trip.createdAt` and the current UTC midnight,
 * returns the whole-day count floored and clamped to zero.
 *
 * @param trip - Trip object whose `createdAt` is parseable by the JavaScript `Date` constructor
 * @returns The number of whole calendar days between the trip's creation date and today (UTC), never negative
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
 * Determine whether a trip can be finalized based on its freights' statuses.
 *
 * @param trip - Trip whose freights will be evaluated
 * @returns `true` if the trip has at least one freight and every freight's status is `'completed'`, `false` otherwise.
 */
export function isTripReadyToFinish(trip: Trip): boolean {
  return trip.freights.length > 0 && trip.freights.every((f) => f.status === "completed");
}
