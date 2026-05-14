import activeTollPointsData from "../../data/tolls/app_ready_toll_points_active.json";

export type TollAxleCount = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type TollDirectionNormalized = "both" | "increasing" | "decreasing" | "unknown";
export type TollCoordinateRole = "plaza_center" | "directional_plaza" | "directional_gantry" | "approximate";

export interface TollPoint {
  id: string;
  name: string;
  uf: string;
  regulator: string;
  jurisdiction: string;
  concessionaire: string;
  road: string | null;
  roadNormalized: string | null;
  km: string | null;
  kmNumber: number | null;
  city: string | null;
  direction: string | null;
  directionNormalized: TollDirectionNormalized;
  lat: number;
  lon: number;
  tariffs: Partial<Record<TollAxleCount, number>>;
  geoConfidence: string;
  valueConfidence: string;
  coordinateRole: TollCoordinateRole;
  expectedHeadingDegrees: number | null;
  headingToleranceDegrees: number | null;
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

function normalizeText(value: unknown): string {
  return asString(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeRoad(value: unknown): string | null {
  const text = normalizeText(value).toUpperCase();
  const match = text.match(/\b([A-Z]{2})[-\s]?(\d{2,3})\b/);
  return match ? `${match[1]}-${match[2]}` : text || null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;

  const normalized = value
    .trim()
    .replace(/[\s\u00A0]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseKm(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;

  const normalized = value
    .trim()
    .replace(",", ".")
    .replace(/[^0-9.-]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeDirection(value: unknown): TollDirectionNormalized {
  const text = normalizeText(value);
  if (!text) return "unknown";
  if (text.includes("crescente") && text.includes("decrescente")) return "both";
  if (text.includes("ambos") || text.includes("bidirecional") || text.includes("duplo")) return "both";
  if (text.includes("sp") && text.includes("rio")) return "increasing";
  if (text.includes("rio") && text.includes("sp")) return "decreasing";
  if (text.includes("crescente")) return "increasing";
  if (text.includes("decrescente")) return "decreasing";
  return "unknown";
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

function isSantaIsabelDutraPoint(point: TollPoint): boolean {
  const city = normalizeText(point.city);
  const name = normalizeText(point.name);
  const concessionaire = normalizeText(point.concessionaire);

  return (
    point.uf === "SP" &&
    point.roadNormalized === "BR-116" &&
    (city.includes("santa isabel") || name.includes("santa isabel")) &&
    (
      concessionaire.includes("dutra") ||
      concessionaire.includes("riosp") ||
      concessionaire.includes("rio sp") ||
      concessionaire.includes("nova dutra")
    )
  );
}

function isViuvaGracaSeropedicaPoint(point: TollPoint): boolean {
  const city = normalizeText(point.city);
  const name = normalizeText(point.name);

  return (
    point.uf === "RJ" &&
    point.roadNormalized === "BR-116" &&
    city.includes("seropedica") &&
    name.includes("viuva graca")
  );
}

function expandDirectionalOverrides(point: TollPoint): TollPoint[] {
  if (!isSantaIsabelDutraPoint(point)) return [point];

  return [
    {
      ...point,
      id: `${point.id}_sentido_sp_rio`,
      name: `${point.name} - Sentido SP-Rio`,
      direction: "SP - Rio",
      directionNormalized: "increasing",
      lat: -23.3466529,
      lon: -46.1648116,
      coordinateRole: "directional_plaza",
      expectedHeadingDegrees: 61,
      headingToleranceDegrees: 75,
    },
    {
      ...point,
      id: `${point.id}_sentido_rio_sp`,
      name: `${point.name} - Sentido Rio-SP`,
      direction: "Rio - SP",
      directionNormalized: "decreasing",
      lat: -23.3387745,
      lon: -46.1502881,
      coordinateRole: "directional_plaza",
      expectedHeadingDegrees: 241,
      headingToleranceDegrees: 75,
    },
  ];
}

function applySinglePointOverrides(point: TollPoint): TollPoint[] {
  if (!isViuvaGracaSeropedicaPoint(point)) return [point];

  const name = normalizeText(point.name);
  const concessionaire = normalizeText(point.concessionaire);

  if (name.includes("norte") || concessionaire.includes("riosp") || concessionaire.includes("rio sp")) {
    return [];
  }

  return [
    {
      ...point,
      name: "P04 Viúva Graça",
      direction: "Crescente/Decrescente",
      directionNormalized: "both",
      lat: -22.7163169,
      lon: -43.7166143,
      coordinateRole: "plaza_center",
      expectedHeadingDegrees: null,
      headingToleranceDegrees: null,
    },
  ];
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
    roadNormalized: normalizeRoad(point.rodovia),
    km: asNullableString(point.km),
    kmNumber: parseKm(point.km),
    city: asNullableString(point.municipio),
    direction: asNullableString(point.sentido),
    directionNormalized: normalizeDirection(point.sentido),
    lat,
    lon,
    tariffs,
    geoConfidence: asString(point.confianca_geo),
    valueConfidence: asString(point.confianca_valor),
    coordinateRole: "plaza_center",
    expectedHeadingDegrees: null,
    headingToleranceDegrees: null,
  };
}

export const SPACE_TRUCK_TOLL_POINTS: readonly TollPoint[] = (activeTollPointsData as RawTollPoint[])
  .map(mapTollPoint)
  .filter((point): point is TollPoint => Boolean(point))
  .flatMap(expandDirectionalOverrides)
  .flatMap(applySinglePointOverrides);
