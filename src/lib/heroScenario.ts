import type { HomeHeroScenario } from "@/components/dashboard/HomeHero";

export interface HeroScenarioFlags {
  hasVehicles: boolean;
  hasActiveTrip: boolean;
  hasHistory: boolean;
}

export function resolveHeroScenario(flags: HeroScenarioFlags): HomeHeroScenario {
  if (!flags.hasVehicles) return "onboarding";
  if (flags.hasActiveTrip) return "active";
  if (flags.hasHistory) return "ready-return";
  return "ready-first";
}
