import activeTollPointsData from "../../data/tolls/app_ready_toll_points_active.json";
import {
  FEDERAL_ANTT_OFFICIAL_EXCLUDED_IDS,
  FEDERAL_ANTT_OFFICIAL_OVERRIDES,
  type FederalAnttTollOfficialOverride,
} from "./anttFederalTollOfficialOverrides";
import { TOLL_POINT_COORDINATE_OVERRIDES } from "./tollPointCoordinateOverrides";

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
  routeCorridorKm?: number;
  chargeGroupId?: string;
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
  const match = text.match(/\b([A-Z]{2,3})[-\s]?(\d{2,3})\b/);
  return match ? `${match[1]}-${match[2]}` : text || null;
}

function normalizeOfficialRoadKey(value: unknown): string {
  const road = normalizeRoad(value);
  return road ? road.replace(/^([A-Z]{2,3})-0*(\d{2,3})$/, "$1-$2") : "";
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
    .replace("+", ".")
    .replace(/[^0-9.-]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeKmKey(value: unknown): string {
  const parsed = parseKm(value);
  if (parsed === null) return normalizeText(value);
  return parsed.toFixed(3).replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
}

function normalizeDirection(value: unknown): TollDirectionNormalized {
  const text = normalizeText(value);
  if (!text) return "unknown";

  const hasCrescente = /\bcrescente\b/.test(text);
  const hasDecrescente = /\bdecrescente\b/.test(text);

  if (hasCrescente && hasDecrescente) return "both";
  if (text.includes("ambos") || text.includes("bidirecional") || text.includes("duplo")) return "both";
  if (/\bsp\b.*\brio\b/.test(text)) return "increasing";
  if (/\brio\b.*\bsp\b/.test(text)) return "decreasing";
  if (hasCrescente) return "increasing";
  if (hasDecrescente) return "decreasing";
  return "unknown";
}

function isFederalAnttPoint(point: Pick<TollPoint, "regulator" | "jurisdiction">): boolean {
  return point.regulator === "ANTT" && point.jurisdiction === "federal";
}

function isActiveCalculationPoint(point: RawTollPoint): boolean {
  return point.calcular_pedagio === true && asString(point.status_operacional).toLowerCase().startsWith("ativo");
}

function buildTariffs(point: RawTollPoint): Partial<Record<TollAxleCount, number>> {
  return Object.fromEntries(
    AXLE_FIELDS.flatMap(([axles, field]) => {
      const value = asNumber(point[field]);
      return value && value > 0 ? [[axles, value]] : [];
    }),
  ) as Partial<Record<TollAxleCount, number>>;
}

function kmMatches(point: TollPoint, candidates: Array<string | number>): boolean {
  const kmText = normalizeText(point.km);
  return candidates.some((candidate) => {
    if (typeof candidate === "number") {
      return point.kmNumber === candidate;
    }

    return kmText === normalizeText(candidate);
  });
}

function getOfficialAnttKey(point: Pick<TollPoint, "roadNormalized" | "uf" | "km">): string {
  return [normalizeOfficialRoadKey(point.roadNormalized), point.uf, normalizeKmKey(point.km)].join("|");
}

function getOfficialOverrideKey(override: FederalAnttTollOfficialOverride): string {
  return [normalizeOfficialRoadKey(override.road), override.uf, normalizeKmKey(override.km)].join("|");
}

const FEDERAL_ANTT_OFFICIAL_OVERRIDES_BY_KEY = FEDERAL_ANTT_OFFICIAL_OVERRIDES.reduce(
  (map, override) => {
    const key = getOfficialOverrideKey(override);
    const values = map.get(key) ?? [];
    values.push(override);
    map.set(key, values);
    return map;
  },
  new Map<string, FederalAnttTollOfficialOverride[]>(),
);

function isOfficialDirectionCompatible(point: TollPoint, override: FederalAnttTollOfficialOverride): boolean {
  const officialDirection = normalizeDirection(override.direction);

  if (point.directionNormalized === "both") return officialDirection === "both";
  if (officialDirection === "both") return false;

  return officialDirection === point.directionNormalized;
}

function getOfficialOverride(point: TollPoint): FederalAnttTollOfficialOverride | undefined {
  if (!isFederalAnttPoint(point)) return undefined;
  return (FEDERAL_ANTT_OFFICIAL_OVERRIDES_BY_KEY.get(getOfficialAnttKey(point)) ?? [])
    .find((override) => isOfficialDirectionCompatible(point, override));
}

function findCoordinateOverride(point: TollPoint) {
  const city = normalizeText(point.city);
  const name = normalizeText(point.name);
  const direction = normalizeText(point.direction);

  return TOLL_POINT_COORDINATE_OVERRIDES.find((override) => (
    point.uf === override.uf &&
    point.roadNormalized === override.roadNormalized &&
    city.includes(override.cityIncludes) &&
    (!override.nameIncludes || override.nameIncludes.every((part) => name.includes(part))) &&
    (!override.directionIncludes || direction.includes(override.directionIncludes)) &&
    (!override.directionNormalized || override.directionNormalized === point.directionNormalized) &&
    kmMatches(point, override.kmCandidates)
  ));
}

function applyOfficialAnttOverride(point: TollPoint): TollPoint[] {
  if (!isFederalAnttPoint(point)) return [point];
  if (FEDERAL_ANTT_OFFICIAL_EXCLUDED_IDS.has(point.id)) return [];

  const official = getOfficialOverride(point);
  if (!official) return [point];

  const officialDirectionNormalized = normalizeDirection(official.direction);
  const officialRoadNormalized = normalizeRoad(official.road);

  return [
    {
      ...point,
      name: official.name,
      concessionaire: official.concessionaire,
      road: official.road,
      roadNormalized: officialRoadNormalized,
      km: official.km,
      kmNumber: parseKm(official.km),
      city: official.city,
      direction: official.direction,
      directionNormalized: officialDirectionNormalized,
      lat: official.lat,
      lon: official.lon,
      coordinateRole: "plaza_center",
      expectedHeadingDegrees: null,
      headingToleranceDegrees: null,
    },
  ];
}

function applySinglePointOverrides(point: TollPoint): TollPoint[] {
  const coordinateOverride = findCoordinateOverride(point);

  if (!coordinateOverride) return [point];

  return [
    {
      ...point,
      lat: coordinateOverride.lat,
      lon: coordinateOverride.lon,
      coordinateRole: "plaza_center",
      expectedHeadingDegrees: null,
      headingToleranceDegrees: null,
    },
  ];
}

function applyChargeGroups(points: TollPoint[]): TollPoint[] {
  return points.map((point) => {
    const normalizedName = normalizeText(point.name);
    const normalizedCity = normalizeText(point.city);
    const normalizedConcessionaireKey = normalizeText(point.concessionaire).replace(/\s+/g, "");
    const isRiospBr116 = point.roadNormalized === "BR-116" && normalizedConcessionaireKey.includes("riosp");

    if (isRiospBr116 && normalizedName.includes("aruja")) {
      return { ...point, chargeGroupId: "br116-aruja-riosp" };
    }
    if (isRiospBr116 && normalizedName.includes("itatiaia")) {
      return { ...point, chargeGroupId: "br116-itatiaia-riosp" };
    }
    if (point.roadNormalized === "SP-021" && normalizedCity.includes("barueri") && normalizedName.includes("castello branco")) {
      return { ...point, chargeGroupId: "sp021-barueri-praca" };
    }
    return point;
  });
}

function createManualBarueriPoints(points: TollPoint[]): TollPoint[] {
  const barueriBase = points.find((point) =>
    point.roadNormalized === "SP-021" &&
    normalizeText(point.city).includes("barueri") &&
    normalizeText(point.name).includes("castello branco") &&
    Object.values(point.tariffs).some((value) => typeof value === "number" && value > 0),
  );

  if (!barueriBase) {
    if (typeof console !== "undefined") {
      console.warn("[tollPoints] base de Barueri (SP-021/Castello Branco) não encontrada; pontos manuais não foram criados.");
    }
    return [];
  }

  const createBarueri = (id: string, lat: number, lon: number): TollPoint => ({
    ...barueriBase,
    id,
    name: "Praça de Pedágio Barueri",
    direction: "Ambos",
    directionNormalized: "both",
    lat,
    lon,
    routeCorridorKm: 0.015,
    chargeGroupId: "sp021-barueri-praca",
    coordinateRole: "plaza_center",
    expectedHeadingDegrees: null,
    headingToleranceDegrees: null,
  });

  return [
    createBarueri("sp_manual_barueri_praca_1", -23.510277, -46.817398),
    createBarueri("sp_manual_barueri_praca_2", -23.509659, -46.817017),
  ];
}

function getFederalAnttSplitChargeGroupId(point: TollPoint): string {
  return point.chargeGroupId ?? `federal-antt-split:${point.id}`;
}

function expandFederalAnttDirections(point: TollPoint): TollPoint[] {
  if (!isFederalAnttPoint(point) || point.directionNormalized !== "both") return [point];

  const chargeGroupId = getFederalAnttSplitChargeGroupId(point);

  return [
    {
      ...point,
      id: `${point.id}_sentido_crescente`,
      name: `${point.name} - Sentido Crescente`,
      direction: "Crescente",
      directionNormalized: "increasing",
      coordinateRole: "directional_plaza",
      chargeGroupId,
    },
    {
      ...point,
      id: `${point.id}_sentido_decrescente`,
      name: `${point.name} - Sentido Decrescente`,
      direction: "Decrescente",
      directionNormalized: "decreasing",
      coordinateRole: "directional_plaza",
      chargeGroupId,
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

const BASE_TOLL_POINTS: TollPoint[] = (activeTollPointsData as RawTollPoint[])
  .map(mapTollPoint)
  .filter((point): point is TollPoint => Boolean(point))
  .flatMap(applyOfficialAnttOverride)
  .flatMap(applySinglePointOverrides)
  .flatMap(expandFederalAnttDirections);

const GROUPED_TOLL_POINTS: TollPoint[] = applyChargeGroups(BASE_TOLL_POINTS);

export const MANUAL_TOLL_POINTS: readonly TollPoint[] = createManualBarueriPoints(GROUPED_TOLL_POINTS);

export const SPACE_TRUCK_TOLL_POINTS: readonly TollPoint[] = [...GROUPED_TOLL_POINTS, ...MANUAL_TOLL_POINTS];
