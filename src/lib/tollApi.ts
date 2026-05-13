import { getRememberedRoutePath } from "@/lib/routeApi";
import {
  calculateRouteToll,
  type TollCalculationResult,
} from "@/lib/tollEngine";

export type TollApiCalculationResult = TollCalculationResult;

export function calculateTollFromRememberedRoute(params: {
  originLat: number;
  originLng: number;
  destLat: number;
  destLng: number;
  axles: number;
}): TollApiCalculationResult | null {
  const routePath = getRememberedRoutePath({
    originLat: params.originLat,
    originLon: params.originLng,
    destLat: params.destLat,
    destLon: params.destLng,
  });

  if (!routePath) return null;

  const result = calculateRouteToll({
    routePath,
    axles: params.axles,
  });

  return result.total > 0 ? result : null;
}

export async function calculateToll(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
  axles: number,
): Promise<number | null> {
  const result = calculateTollFromRememberedRoute({
    originLat,
    originLng,
    destLat,
    destLng,
    axles,
  });

  return result?.total ?? null;
}
