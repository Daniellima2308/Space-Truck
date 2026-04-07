import type { Freight, Trip } from "@/types";

export function getOperationalFreights(trip: Trip): Freight[] {
  return trip.freights.filter((freight) => freight.status === "in_progress" || freight.status === "completed");
}

export function getPlannedFreights(trip: Trip): Freight[] {
  return trip.freights.filter((freight) => freight.status === "planned");
}

export function getFinalizedFreights(trip: Trip): Freight[] {
  return trip.status === "finished" ? getOperationalFreights(trip) : trip.freights;
}
