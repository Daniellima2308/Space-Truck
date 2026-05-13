import activeTollPointsData from "../../data/tolls/app_ready_toll_points_active.json";

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

interface RawTollPoint {
  toll_point_id?: unknown;
  uf?: unknown;
  regulador?: unknown;
  jurisdicao?: unknown;
  concessionaria?: unknown;
  nome?: unknown;
  rodovia?: unknown;
  km?: unknown;
  municipio?: unknown;
  sentido?: unknown;
  latitude?: unknown;
  longitude?: unknown;
  eixos_2_brl?: unknown;
  eixos_3_brl?: unknown;
  eixos_4_brl?: unknown;
  eixos_5_brl?: unknown;
  eixos_6_brl?: unknown;
  eixos_7_brl?: unknown;
  eixos_8_brl?: unknown;
  eixos_9_brl?: unknown;
  status_operacional?: unknown;
  calcular_pedagio?: unknown;
  confianca_geo?: unknown;
  confianca_valor?: unknown;
}

export const SPACE_TRUCK_TOLL_BASE_SOURCE = "space_truck_toll_base" as const;

const AXLE_FIELDS: Array<[TollAxleCount, keyof RawTollPoint]> = [
  [2, "eixos_2_brl"],
  [3, "eixos_3_brl"],
  [4, "eixos_4_brl"],
  [5, "eixos_5_brl"],
  [6, "eixos_6_brl"],
  [7, "eixos_7_brl"],
  [8, "eixos_8_brl"],
  [9, "eixos_9_brl"],
];

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asNullableString(value: unknown): string | null {
  const normalized = asString(value);
  return normalized || null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;

  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function isActiveCalculationPoint(point: RawTollPoint): boolean {
  return point.calcular_pedagio === true && asString(point.status_operacional) === "ativo";
}

function buildTariffs(point: RawTollPoint): Partial<Record<TollAxleCount, number>> {
  return Object.fromEntries(
    AXLE_FIELDS.flatMap(([axles, field]) => {
      const value = asNumber(point[field]);
      return value && value > 0 ? [[axles, value]] : [];
    }),
  ) as Partial<Record<TollAxleCount, number>>;
}

function mapTollPoint(point: RawTollPoint): TollPoint | null {
  if (!isActiveCalculationPoint(point)) return null;

  const id = asString(point.toll_point_id);
  const lat = asNumber(point.latitude);
  const lon = asNumber(point.longitude);
  const tariffs = buildTariffs(point);

  if (!id || lat === null || lon === null || Object.keys(tariffs).length === 0) {
    return null;
  }

  return {
    id,
    name: asString(point.nome) || id,
    uf: asString(point.uf),
    regulator: asString(point.regulador),
    jurisdiction: asString(point.jurisdicao),
    concessionaire: asString(point.concessionaria),
    road: asNullableString(point.rodovia),
    km: asNullableString(point.km),
    city: asNullableString(point.municipio),
    direction: asNullableString(point.sentido),
    lat,
    lon,
    tariffs,
    geoConfidence: asString(point.confianca_geo),
    valueConfidence: asString(point.confianca_valor),
  };
}

export const SPACE_TRUCK_TOLL_POINTS: readonly TollPoint[] = (activeTollPointsData as RawTollPoint[])
  .map(mapTollPoint)
  .filter((point): point is TollPoint => Boolean(point));
