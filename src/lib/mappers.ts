import {
  type Vehicle,
  type Freight,
  type Fueling,
  type Expense,
  type PersonalExpense,
  type MaintenanceService,
  type Trip,
  type TripStatus,
  type FreightStatus,
  type ExpenseCategory,
  type PersonalExpenseCategory,
  EXPENSE_CATEGORY_LABELS,
  PERSONAL_EXPENSE_LABELS,
  type DeliveryProofStatus,
  type BalanceReleaseMode,
  type BalanceAdjustment,
  type ReceivableMode,
} from "@/types";
import { isDriverBond, isVehicleOperationProfile } from "@/lib/vehicleOperation";
import { normalizeTripFreights } from "@/lib/freightStatus";
import { sortFuelingsByTimeline } from "@/lib/fueling";

// ---------------------------------------------------------------------------
// Row types (snake_case fields as returned by Supabase)
// ---------------------------------------------------------------------------

export interface VehicleRow {
  id: string;
  brand: string;
  model: string;
  year: number;
  plate: string;
  is_fleet_owner: boolean | null;
  driver_name: string | null;
  current_km: number | null;
  operation_profile: string | null;
  driver_bond: string | null;
  default_commission_percent: number | null;
}

export interface FreightRow {
  id: string;
  trip_id: string;
  origin: string;
  destination: string;
  km_initial: number;
  gross_value: number;
  commission_percent: number;
  commission_value: number;
  status: string | null;
  estimated_distance: number | null;
  payment_due_date: string | null;
  receivable_mode?: string | null;
  amount_received: number | null;
  advance_amount: number | null;
  payer_name: string | null;
  delivery_proof_status: string | null;
  balance_release_mode: string | null;
  balance_adjustments: BalanceAdjustment[] | null;
  created_at: string;
}

export interface FuelingRow {
  id: string;
  trip_id: string;
  station: string;
  total_value: number;
  liters: number;
  price_per_liter: number;
  km_current: number;
  full_tank: boolean | null;
  average: number;
  date: string;
  receipt_url: string | null;
  allocated_value: number | null;
  original_total_value: number | null;
}

export interface ExpenseRow {
  id: string;
  trip_id: string;
  category: string;
  description: string;
  value: number;
  date: string;
  receipt_url: string | null;
}

export interface PersonalExpenseRow {
  id: string;
  trip_id: string;
  category: string;
  description: string;
  value: number;
  date: string;
}

export interface TripRow {
  id: string;
  vehicle_id: string;
  status: string;
  created_at: string;
  finished_at: string | null;
  estimated_distance: number | null;
}

export interface MaintenanceServiceRow {
  id: string;
  vehicle_id: string;
  service_name: string;
  last_change_km: number;
  interval_km: number;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Individual row mappers (pure functions)
// ---------------------------------------------------------------------------

export function mapVehicleRow(v: VehicleRow): Vehicle {
  return {
    id: v.id,
    brand: v.brand,
    model: v.model,
    year: v.year,
    plate: v.plate,
    isFleetOwner: v.is_fleet_owner,
    driverName: v.driver_name,
    currentKm: v.current_km || 0,
    operationProfile: isVehicleOperationProfile(v.operation_profile)
      ? v.operation_profile
      : "driver_owner",
    driverBond: isDriverBond(v.driver_bond) ? v.driver_bond : undefined,
    defaultCommissionPercent: v.default_commission_percent ?? undefined,
  };
}

const FREIGHT_STATUSES: ReadonlySet<string> = new Set<FreightStatus>(["planned", "in_progress", "completed"]);
const DELIVERY_PROOF_STATUSES: ReadonlySet<DeliveryProofStatus> = new Set<DeliveryProofStatus>([
  "not_required",
  "pending_send",
  "sent",
  "confirmed",
]);
const BALANCE_RELEASE_MODES: ReadonlySet<BalanceReleaseMode> = new Set<BalanceReleaseMode>([
  "none",
  "proof_photo",
  "physical_proof",
  "agreed_deadline",
  "direct_delivery",
]);
const RECEIVABLE_MODES: ReadonlySet<ReceivableMode> = new Set<ReceivableMode>([
  "off",
  "basic",
  "complete",
]);

export function mapFreightRow(f: FreightRow): Freight {
  return {
    id: f.id,
    tripId: f.trip_id,
    origin: f.origin,
    destination: f.destination,
    kmInitial: f.km_initial,
    grossValue: f.gross_value,
    commissionPercent: f.commission_percent,
    commissionValue: f.commission_value,
    status: FREIGHT_STATUSES.has(f.status ?? "") ? (f.status as FreightStatus) : "planned",
    estimatedDistance: f.estimated_distance || 0,
    paymentDueDate: f.payment_due_date || undefined,
    receivableMode: RECEIVABLE_MODES.has((f.receivable_mode ?? "") as ReceivableMode)
      ? (f.receivable_mode as ReceivableMode)
      : "complete",
    amountReceived: f.amount_received ?? 0,
    advanceAmount: f.advance_amount ?? 0,
    payerName: f.payer_name || undefined,
    deliveryProofStatus: DELIVERY_PROOF_STATUSES.has((f.delivery_proof_status ?? "") as DeliveryProofStatus)
      ? (f.delivery_proof_status as DeliveryProofStatus)
      : "not_required",
    balanceReleaseMode: BALANCE_RELEASE_MODES.has((f.balance_release_mode ?? "") as BalanceReleaseMode)
      ? (f.balance_release_mode as BalanceReleaseMode)
      : "none",
    balanceAdjustments: Array.isArray(f.balance_adjustments) ? f.balance_adjustments : [],
    createdAt: f.created_at,
  };
}

export function mapFuelingRow(f: FuelingRow): Fueling {
  return {
    id: f.id,
    tripId: f.trip_id,
    stationName: f.station,
    totalValue: f.total_value,
    liters: f.liters,
    pricePerLiter: f.price_per_liter,
    kmCurrent: f.km_current,
    fullTank: f.full_tank ?? true,
    average: f.average,
    date: f.date,
    receiptUrl: f.receipt_url || undefined,
    allocatedValue: f.allocated_value ?? undefined,
    originalTotalValue: f.original_total_value ?? undefined,
  };
}

export function mapExpenseRow(e: ExpenseRow): Expense {
  const category = (e.category in EXPENSE_CATEGORY_LABELS)
    ? (e.category as ExpenseCategory)
    : "outros";
  return {
    id: e.id,
    tripId: e.trip_id,
    category,
    description: e.description,
    value: e.value,
    date: e.date,
    receiptUrl: e.receipt_url || undefined,
  };
}

export function mapPersonalExpenseRow(pe: PersonalExpenseRow): PersonalExpense {
  const category = (pe.category in PERSONAL_EXPENSE_LABELS)
    ? (pe.category as PersonalExpenseCategory)
    : "outros";
  return {
    id: pe.id,
    tripId: pe.trip_id,
    category,
    description: pe.description,
    value: pe.value,
    date: pe.date,
  };
}

export function mapMaintenanceServiceRow(s: MaintenanceServiceRow): MaintenanceService {
  return {
    id: s.id,
    vehicleId: s.vehicle_id,
    serviceName: s.service_name,
    lastChangeKm: s.last_change_km,
    intervalKm: s.interval_km,
    createdAt: s.created_at,
  };
}

// ---------------------------------------------------------------------------
// Map builders — group rows by trip_id
// ---------------------------------------------------------------------------

export function buildFreightsMap(rows: FreightRow[]): Map<string, Freight[]> {
  const map = new Map<string, Freight[]>();
  rows.forEach((f) => {
    const freight = mapFreightRow(f);
    if (!map.has(f.trip_id)) map.set(f.trip_id, []);
    map.get(f.trip_id)!.push(freight);
  });
  return map;
}

export function buildFuelingsMap(rows: FuelingRow[]): Map<string, Fueling[]> {
  const map = new Map<string, Fueling[]>();
  rows.forEach((f) => {
    const fueling = mapFuelingRow(f);
    if (!map.has(f.trip_id)) map.set(f.trip_id, []);
    map.get(f.trip_id)!.push(fueling);
  });
  return map;
}

export function buildExpensesMap(rows: ExpenseRow[]): Map<string, Expense[]> {
  const map = new Map<string, Expense[]>();
  rows.forEach((e) => {
    const expense = mapExpenseRow(e);
    if (!map.has(e.trip_id)) map.set(e.trip_id, []);
    map.get(e.trip_id)!.push(expense);
  });
  return map;
}

export function buildPersonalExpensesMap(rows: PersonalExpenseRow[]): Map<string, PersonalExpense[]> {
  const map = new Map<string, PersonalExpense[]>();
  rows.forEach((pe) => {
    const item = mapPersonalExpenseRow(pe);
    if (!map.has(pe.trip_id)) map.set(pe.trip_id, []);
    map.get(pe.trip_id)!.push(item);
  });
  return map;
}

const TRIP_STATUSES: ReadonlySet<string> = new Set<TripStatus>(["open", "finished"]);

// ---------------------------------------------------------------------------
// Trip assembler — builds Trip[] from rows + pre-built sub-entity maps
// Normalizes freight statuses and sorts fuelings by timeline internally.
// ---------------------------------------------------------------------------

export function buildTripsFromRows(params: {
  tripRows: TripRow[];
  freightsMap: Map<string, Freight[]>;
  fuelingsMap: Map<string, Fueling[]>;
  expensesMap: Map<string, Expense[]>;
  personalExpMap: Map<string, PersonalExpense[]>;
}): Trip[] {
  const normalizedFreightsMap = new Map<string, Freight[]>();
  for (const [tripId, freights] of params.freightsMap.entries()) {
    normalizedFreightsMap.set(tripId, normalizeTripFreights(freights));
  }

  return params.tripRows.map((t) => ({
    id: t.id,
    vehicleId: t.vehicle_id,
    status: TRIP_STATUSES.has(t.status) ? (t.status as TripStatus) : "open",
    freights: normalizedFreightsMap.get(t.id) || [],
    fuelings: sortFuelingsByTimeline(params.fuelingsMap.get(t.id) || []),
    expenses: params.expensesMap.get(t.id) || [],
    personalExpenses: params.personalExpMap.get(t.id) || [],
    createdAt: t.created_at,
    finishedAt: t.finished_at,
    estimatedDistance: t.estimated_distance || 0,
  }));
}
