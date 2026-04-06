import { describe, expect, it } from "vitest";
import { getTripAgeDays, isTripReadyToFinish } from "@/lib/operationUtils";
import type { Trip, Freight } from "@/types";

// ── helpers ──────────────────────────────────────────────────────────────────

function makeTrip(createdAtIso: string, freights: Freight[] = []): Trip {
  return {
    id: "trip-test",
    vehicleId: "vehicle-test",
    status: "open",
    freights,
    fuelings: [],
    expenses: [],
    personalExpenses: [],
    createdAt: createdAtIso,
    estimatedDistance: 0,
  };
}

function makeFreight(id: string, status: Freight["status"]): Freight {
  return {
    id,
    tripId: "trip-test",
    origin: "Origem",
    destination: "Destino",
    kmInitial: 0,
    grossValue: 1000,
    commissionPercent: 10,
    commissionValue: 100,
    status,
    estimatedDistance: 200,
    createdAt: "2026-01-01T00:00:00.000Z",
  };
}

// Return a UTC-midnight ISO string N calendar days before UTC today.
function utcDaysAgo(n: number): string {
  const now = new Date();
  const d = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - n),
  );
  return d.toISOString();
}

// ── getTripAgeDays ────────────────────────────────────────────────────────────

describe("getTripAgeDays", () => {
  it("returns 0 for a trip created today (UTC midnight)", () => {
    const trip = makeTrip(utcDaysAgo(0));
    expect(getTripAgeDays(trip)).toBe(0);
  });

  it("returns 1 for a trip created exactly 1 UTC calendar day ago", () => {
    const trip = makeTrip(utcDaysAgo(1));
    expect(getTripAgeDays(trip)).toBe(1);
  });

  it("returns 7 for a trip created 7 days ago", () => {
    const trip = makeTrip(utcDaysAgo(7));
    expect(getTripAgeDays(trip)).toBe(7);
  });

  it("returns 0 (clamped) for a trip created in the future", () => {
    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const trip = makeTrip(tomorrow.toISOString());
    expect(getTripAgeDays(trip)).toBe(0);
  });

  it("treats a trip created late at night UTC as same calendar day", () => {
    const now = new Date();
    // 23:59:59 UTC today — still today
    const lateToday = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59),
    );
    const trip = makeTrip(lateToday.toISOString());
    expect(getTripAgeDays(trip)).toBe(0);
  });

  it("treats a trip created 1 second before UTC midnight yesterday as 1 day ago", () => {
    const now = new Date();
    // 23:59:59 UTC yesterday
    const lateYesterday = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1, 23, 59, 59),
    );
    const trip = makeTrip(lateYesterday.toISOString());
    expect(getTripAgeDays(trip)).toBe(1);
  });
});

// ── isTripReadyToFinish ───────────────────────────────────────────────────────

describe("isTripReadyToFinish", () => {
  it("returns false when the trip has no freights", () => {
    const trip = makeTrip(utcDaysAgo(1), []);
    expect(isTripReadyToFinish(trip)).toBe(false);
  });

  it("returns true when all freights are completed", () => {
    const trip = makeTrip(utcDaysAgo(1), [
      makeFreight("f1", "completed"),
      makeFreight("f2", "completed"),
    ]);
    expect(isTripReadyToFinish(trip)).toBe(true);
  });

  it("returns false when at least one freight is in_progress", () => {
    const trip = makeTrip(utcDaysAgo(1), [
      makeFreight("f1", "completed"),
      makeFreight("f2", "in_progress"),
    ]);
    expect(isTripReadyToFinish(trip)).toBe(false);
  });

  it("returns false when at least one freight is planned", () => {
    const trip = makeTrip(utcDaysAgo(1), [
      makeFreight("f1", "completed"),
      makeFreight("f2", "planned"),
    ]);
    expect(isTripReadyToFinish(trip)).toBe(false);
  });

  it("returns false when the only freight is in_progress", () => {
    const trip = makeTrip(utcDaysAgo(1), [makeFreight("f1", "in_progress")]);
    expect(isTripReadyToFinish(trip)).toBe(false);
  });

  it("returns true with a single completed freight", () => {
    const trip = makeTrip(utcDaysAgo(1), [makeFreight("f1", "completed")]);
    expect(isTripReadyToFinish(trip)).toBe(true);
  });
});
