export type TollAxleCount = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export interface TollPoint {
  id: string;
  name: string;
  uf: string;
  regulator: string;
  jurisdiction: string;
  concessionaire: string;
  road: string | null;
  km: string | null;
  city: string | null;
  direction: string | null;
  lat: number;
  lon: number;
  tariffs: Partial<Record<TollAxleCount, number>>;
  geoConfidence: string;
  valueConfidence: string;
}

export const SPACE_TRUCK_TOLL_BASE_SOURCE = "space_truck_toll_base" as const;

export const SPACE_TRUCK_TOLL_POINTS: readonly TollPoint[] = [] as const;
