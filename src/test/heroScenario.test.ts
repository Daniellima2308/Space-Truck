import { describe, expect, it } from "vitest";
import { resolveHeroScenario } from "@/lib/heroScenario";

describe("resolveHeroScenario", () => {
  it("returns 'onboarding' when there are no vehicles (regardless of other flags)", () => {
    expect(resolveHeroScenario({ hasVehicles: false, hasActiveTrip: false, hasHistory: false })).toBe("onboarding");
    expect(resolveHeroScenario({ hasVehicles: false, hasActiveTrip: true, hasHistory: false })).toBe("onboarding");
    expect(resolveHeroScenario({ hasVehicles: false, hasActiveTrip: false, hasHistory: true })).toBe("onboarding");
    expect(resolveHeroScenario({ hasVehicles: false, hasActiveTrip: true, hasHistory: true })).toBe("onboarding");
  });

  it("returns 'active' when there is a vehicle and an active trip", () => {
    expect(resolveHeroScenario({ hasVehicles: true, hasActiveTrip: true, hasHistory: false })).toBe("active");
    expect(resolveHeroScenario({ hasVehicles: true, hasActiveTrip: true, hasHistory: true })).toBe("active");
  });

  it("returns 'ready-return' when there is a vehicle, no active trip, and trip history", () => {
    expect(resolveHeroScenario({ hasVehicles: true, hasActiveTrip: false, hasHistory: true })).toBe("ready-return");
  });

  it("returns 'ready-first' when there is a vehicle, no active trip, and no history", () => {
    expect(resolveHeroScenario({ hasVehicles: true, hasActiveTrip: false, hasHistory: false })).toBe("ready-first");
  });
});
