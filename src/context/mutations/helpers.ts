import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Trip, Fueling, Freight, FreightStatus, TripStatus } from "@/types";
import {
  getKmBounds,
} from "@/lib/fieldValidation";
import {
  buildFuelingFinancialPlan,
  buildTripStartKmMap,
  calculateFuelingPricePerLiter,
  getFuelingOriginalTotalValue,
} from "@/lib/fueling";
import { mapFreightRow } from "@/lib/mappers";
import { normalizeTripFreights } from "@/lib/freightStatus";

export const round2 = (value: number) => Math.round(value * 100) / 100;

export function getTripMaxRealKm(trip: Trip | undefined, vehicleCurrentKm = 0) {
  if (!trip) return vehicleCurrentKm;

  return Math.max(
    vehicleCurrentKm,
    ...trip.fuelings.map((fueling) => fueling.kmCurrent || 0),
    ...trip.freights
      .filter((freight) => freight.status === "in_progress" || freight.status === "completed")
      .map((freight) => freight.kmInitial || 0),
  );
}

export function getTripStartKm(trip: Trip | undefined) {
  if (!trip) return null;

  const checkpoints = [
    ...trip.fuelings.map((fueling) => fueling.kmCurrent),
    ...trip.freights
      .filter((freight) => freight.status === "in_progress" || freight.status === "completed")
      .map((freight) => freight.kmInitial),
  ].filter((km): km is number => Number.isFinite(km) && km >= 0);

  if (checkpoints.length === 0) return null;
  return Math.min(...checkpoints);
}

export function getTripPendingPlannedFreights(trip: Trip | undefined) {
  return (trip?.freights || []).filter((freight) => freight.status === "planned");
}

export function showActionSuccess(title: string, description?: string) {
  toast({ title, description });
}

export function showActionNotice(title: string, description?: string) {
  toast({
    title,
    description,
    variant: "notice",
  });
}

export function showActionError(title: string, description?: string) {
  toast({
    title,
    description: description || "Tenta novamente.",
    variant: "destructive",
  });
}

export function showOfflineSaved(title: string) {
  showActionNotice(
    title,
    "Salvo no celular. Quando houver sinal, o app envia para a nuvem.",
  );
}

export function buildRouteFailureDetails(params: {
  reason: string | null;
  originQueryUsed?: string;
  destinationQueryUsed?: string;
}): string {
  return (
    params.reason ||
    "A rota foi salva, mas a previsão ainda não foi liberada."
  );
}

export function buildOfflineSyncRouteToast(
  routeSyncFailures: string[],
): { title: string; description: string } | null {
  if (routeSyncFailures.length === 0) return null;
  if (routeSyncFailures.length === 1) {
    return {
      title: "Sincronização parcial",
      description:
        "Um frete foi salvo, mas a previsão da rota ainda está em ajuste.",
    };
  }

  return {
    title: "Sincronização parcial",
    description: `${routeSyncFailures.length} fretes foram salvos e ainda têm rota em ajuste.`,
  };
}

export interface FreightRouteResolution {
  estimatedDistance: number;
  diagnostic: {
    distanceKm: number | null;
    reason: string | null;
    originQueryUsed?: string;
    destinationQueryUsed?: string;
    source?: "cache" | "provider";
  };
}

export async function resolveFreightEstimatedDistance(params: {
  userId: string;
  origin: string;
  destination: string;
}): Promise<FreightRouteResolution> {
  const { getRouteDistanceDiagnosticWithCache } =
    await import("@/lib/routeApi");
  const diagnostic = await getRouteDistanceDiagnosticWithCache({
    origin: params.origin,
    destination: params.destination,
    userId: params.userId,
  });

  return {
    estimatedDistance:
      diagnostic.distanceKm && diagnostic.distanceKm > 0
        ? diagnostic.distanceKm
        : 0,
    diagnostic,
  };
}

export async function refreshFreightEstimatedDistance(params: {
  userId: string;
  origin: string;
  destination: string;
}): Promise<FreightRouteResolution> {
  const { refreshRouteDistanceCache } = await import("@/lib/routeApi");
  const diagnostic = await refreshRouteDistanceCache({
    origin: params.origin,
    destination: params.destination,
    userId: params.userId,
  });

  return {
    estimatedDistance:
      diagnostic.distanceKm && diagnostic.distanceKm > 0
        ? diagnostic.distanceKm
        : 0,
    diagnostic,
  };
}

export async function updateTripEstimatedDistanceBySum(tripId: string): Promise<void> {
  const { data: dbFreights, error: freightsError } = await supabase
    .from("freights")
    .select("estimated_distance")
    .eq("trip_id", tripId);

  if (freightsError) {
    throw new Error(
      freightsError.message ||
        "Falha ao carregar fretes para somar distância estimada.",
    );
  }

  const totalEstimated = (dbFreights || []).reduce(
    (sum, freight) => sum + (freight.estimated_distance || 0),
    0,
  );

  const { error: tripUpdateError } = await supabase
    .from("trips")
    .update({ estimated_distance: totalEstimated })
    .eq("id", tripId);

  if (tripUpdateError) {
    throw new Error(
      tripUpdateError.message ||
        "Falha ao salvar distância estimada da viagem.",
    );
  }
}

export async function recalculateTripEstimatedDistance(tripId: string): Promise<void> {
  try {
    await updateTripEstimatedDistanceBySum(tripId);
  } catch (error) {
    console.error(
      "Falha ao recalcular distância estimada da viagem",
      error,
    );
    toast({
      title: "Falha ao recalcular rota estimada",
      description:
        error instanceof Error
          ? error.message
          : "Erro inesperado ao atualizar distância da viagem.",
      variant: "destructive",
    });
  }
}

export async function ensureMutation<T extends { message?: string } | null>(
  mutation: PromiseLike<{ data: unknown; error: T }>,
  fallbackMessage: string,
) {
  const result = await mutation;
  if (result.error) {
    throw new Error(result.error.message || fallbackMessage);
  }

  return result;
}

export interface VehicleFuelingSnapshot {
  trips: Trip[];
  tripIds: string[];
  fuelings: Array<{
    id: string;
    trip_id: string;
    station: string;
    total_value: number;
    liters: number;
    km_current: number;
    full_tank: boolean | null;
    date: string;
    receipt_url: string | null;
    original_total_value: number | null;
  }>;
}

export async function getVehicleFuelingSnapshot(vehicleId: string): Promise<VehicleFuelingSnapshot> {
  const { data: vehicleTrips, error: tripsError } = await supabase
    .from("trips")
    .select("id,status,created_at,finished_at,estimated_distance")
    .eq("vehicle_id", vehicleId);

  if (tripsError) {
    throw new Error(tripsError.message || "Falha ao carregar viagens do veículo.");
  }

  const tripIds = (vehicleTrips || []).map((trip) => trip.id);
  if (tripIds.length === 0) {
    return { trips: [], tripIds: [], fuelings: [] };
  }

  const [{ data: freights, error: freightsError }, { data: fuelings, error: fuelingsError }] =
    await Promise.all([
      supabase
        .from("freights")
        .select("id,trip_id,origin,destination,km_initial,gross_value,commission_percent,commission_value,status,estimated_distance,created_at")
        .in("trip_id", tripIds),
      supabase
        .from("fuelings")
        .select("id,trip_id,station,total_value,liters,km_current,full_tank,date,receipt_url,original_total_value")
        .in("trip_id", tripIds),
    ]);

  if (freightsError) {
    throw new Error(freightsError.message || "Falha ao carregar fretes para revisar combustível.");
  }

  if (fuelingsError) {
    throw new Error(fuelingsError.message || "Falha ao carregar abastecimentos do veículo.");
  }

  const freightsByTrip = new Map<string, Freight[]>();
  (freights || []).forEach((freight) => {
    const normalized = mapFreightRow(freight);
    const existing = freightsByTrip.get(freight.trip_id);
    if (existing) {
      existing.push(normalized);
    } else {
      freightsByTrip.set(freight.trip_id, [normalized]);
    }
  });

  const fuelingsByTrip = new Map<string, Fueling[]>();
  (fuelings || []).forEach((fueling) => {
    const normalized: Fueling = {
      id: fueling.id,
      tripId: fueling.trip_id,
      stationName: fueling.station,
      totalValue: fueling.total_value,
      liters: fueling.liters,
      pricePerLiter: 0,
      kmCurrent: fueling.km_current,
      fullTank: fueling.full_tank ?? true,
      average: 0,
      date: fueling.date,
      receiptUrl: fueling.receipt_url || undefined,
      originalTotalValue: fueling.original_total_value ?? undefined,
    };

    const existing = fuelingsByTrip.get(fueling.trip_id);
    if (existing) {
      existing.push(normalized);
    } else {
      fuelingsByTrip.set(fueling.trip_id, [normalized]);
    }
  });

  const trips: Trip[] = (vehicleTrips || []).map((trip) => ({
    id: trip.id,
    vehicleId,
    status: trip.status as TripStatus,
    freights: normalizeTripFreights(freightsByTrip.get(trip.id) || []),
    fuelings: fuelingsByTrip.get(trip.id) || [],
    expenses: [],
    personalExpenses: [],
    createdAt: trip.created_at,
    finishedAt: trip.finished_at,
    estimatedDistance: trip.estimated_distance || 0,
  }));

  return {
    trips,
    tripIds,
    fuelings: fuelings || [],
  };
}

export function getFreightCreationFeedback(status: FreightStatus) {
  if (status === "in_progress") {
    return {
      title: "Frete iniciado",
      description: "Este trecho já virou o trecho atual da viagem.",
      variant: "success" as const,
    };
  }

  return {
    title: "Próximo frete adicionado",
    description: "Trecho salvo e aguardando início.",
    variant: "notice" as const,
  };
}

export function getVehicleCurrentKmFromSources(params: {
  freightKms: Array<number | null | undefined>;
  fuelingKms: Array<number | null | undefined>;
}) {
  const validFreightKms = params.freightKms.filter(
    (km): km is number => typeof km === "number" && Number.isFinite(km) && km >= 0,
  );
  const validFuelingKms = params.fuelingKms.filter(
    (km): km is number => typeof km === "number" && Number.isFinite(km) && km >= 0,
  );
  const maxKm = Math.max(0, ...validFreightKms, ...validFuelingKms);

  return {
    maxKm,
    hasKmRecords: validFreightKms.length > 0 || validFuelingKms.length > 0,
  };
}

export async function recalculateVehicleKm(vehicleId: string) {
  const { data: vehicleTrips } = await supabase
    .from("trips")
    .select("id")
    .eq("vehicle_id", vehicleId);
  const tripIds = (vehicleTrips || []).map((t) => t.id);

  if (tripIds.length === 0) {
    return;
  }

  const [{ data: fuelings }, { data: freights }] = await Promise.all([
    supabase.from("fuelings").select("km_current").in("trip_id", tripIds),
    supabase
      .from("freights")
      .select("km_initial,status")
      .in("trip_id", tripIds)
      .in("status", ["in_progress", "completed"]),
  ]);

  const { maxKm, hasKmRecords } = getVehicleCurrentKmFromSources({
    fuelingKms: (fuelings || []).map((fueling) => fueling.km_current),
    freightKms: (freights || []).map((freight) => freight.km_initial),
  });

  if (hasKmRecords) {
    await supabase
      .from("vehicles")
      .update({ current_km: maxKm })
      .eq("id", vehicleId);
  }
}

export async function getVehicleTimelineKms(
  vehicleId: string,
  exclude?: { fuelingId?: string; freightId?: string },
) {
  const { data: vehicleTrips } = await supabase
    .from("trips")
    .select("id")
    .eq("vehicle_id", vehicleId);

  const tripIds = (vehicleTrips || []).map((t) => t.id);
  if (tripIds.length === 0) return [];

  const [{ data: fuelings }, { data: freights }] = await Promise.all([
    supabase.from("fuelings").select("id,km_current").in("trip_id", tripIds),
    supabase.from("freights").select("id,km_initial").in("trip_id", tripIds),
  ]);

  const fuelingKms = (fuelings || [])
    .filter((f) => !exclude?.fuelingId || f.id !== exclude.fuelingId)
    .map((f) => f.km_current);

  const freightKms = (freights || [])
    .filter((f) => !exclude?.freightId || f.id !== exclude.freightId)
    .map((f) => f.km_initial);

  return getKmBounds([...fuelingKms, ...freightKms]);
}

export function showWarnings(warnings: string[]) {
  warnings.forEach((warning) => {
    toast({ title: "Confere esse número rapidinho", description: warning });
  });
}

export async function reprocessVehicleFuelings(params: {
  userId: string;
  vehicleId: string;
}) {
  const snapshot = await getVehicleFuelingSnapshot(params.vehicleId);
  if (snapshot.tripIds.length === 0) return;

  const tripStartKmMap = buildTripStartKmMap(snapshot.trips);
  const financialPlan = buildFuelingFinancialPlan({
    fuelings: snapshot.fuelings.map((fueling) => ({
      id: fueling.id,
      tripId: fueling.trip_id,
      stationName: fueling.station,
      totalValue: getFuelingOriginalTotalValue({
        totalValue: fueling.total_value,
        originalTotalValue: fueling.original_total_value,
      }),
      liters: fueling.liters,
      kmCurrent: fueling.km_current,
      fullTank: fueling.full_tank ?? true,
      date: fueling.date,
      receiptUrl: fueling.receipt_url,
      originalTotalValue: fueling.original_total_value,
    })),
    tripStartKmMap,
  });

  const fuelingIds = snapshot.fuelings.map((fueling) => fueling.id);
  if (fuelingIds.length > 0) {
    await ensureMutation(
      supabase.from("expenses").delete().in("source_fueling_id", fuelingIds),
      "Falha ao limpar rateios anteriores do combustível.",
    );
  }

  for (const computed of financialPlan) {
    await ensureMutation(
      supabase
        .from("fuelings")
        .update({
          total_value: computed.effectiveTripValue,
          price_per_liter: computed.pricePerLiter,
          average: computed.average,
          allocated_value: computed.allocatedValue,
          original_total_value: computed.originalTotalValue,
        })
        .eq("id", computed.id),
      "Falha ao recalcular um abastecimento do veículo.",
    );
  }

  const rateioExpenses = financialPlan.flatMap((computed) =>
    computed.rateioExpenses.map((expense) => ({
      trip_id: expense.tripId,
      user_id: params.userId,
      category: "combustivel_rateio",
      description: expense.description,
      value: expense.value,
      date: expense.date,
      source_fueling_id: expense.sourceFuelingId,
    })),
  );

  if (rateioExpenses.length > 0) {
    await ensureMutation(
      supabase.from("expenses").insert(rateioExpenses),
      "Falha ao recriar os rateios do combustível.",
    );
  }
}

export interface FuelingInputData {
  stationName: string;
  totalValue: number;
  liters: number;
  kmCurrent: number;
  date: string;
  fullTank: boolean;
  receiptUrl?: string;
}

export async function getTripVehicleId(tripId: string) {
  const { data, error } = await supabase
    .from("trips")
    .select("vehicle_id")
    .eq("id", tripId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Falha ao localizar o veículo da viagem.");
  }

  if (!data?.vehicle_id) {
    throw new Error("Viagem não encontrada para este abastecimento.");
  }

  return data.vehicle_id;
}

export async function persistFuelingAdd(params: {
  userId: string;
  tripId: string;
  fuelingId: string;
  fueling: FuelingInputData;
}) {
  const originalTotalValue = round2(params.fueling.totalValue);
  const vehicleId = await getTripVehicleId(params.tripId);

  await ensureMutation(
    supabase.from("fuelings").insert({
      id: params.fuelingId,
      trip_id: params.tripId,
      user_id: params.userId,
      station: params.fueling.stationName,
      total_value: originalTotalValue,
      liters: params.fueling.liters,
      price_per_liter: calculateFuelingPricePerLiter(
        originalTotalValue,
        params.fueling.liters,
      ),
      km_current: params.fueling.kmCurrent,
      full_tank: params.fueling.fullTank,
      average: 0,
      date: params.fueling.date,
      receipt_url: params.fueling.receiptUrl || null,
      allocated_value: null,
      original_total_value: null,
    }),
    "Falha ao salvar o abastecimento.",
  );

  await reprocessVehicleFuelings({ userId: params.userId, vehicleId });
  await recalculateVehicleKm(vehicleId);
}

export async function persistFuelingUpdate(params: {
  userId: string;
  tripId: string;
  fuelingId: string;
  fueling: FuelingInputData;
}) {
  const vehicleId = await getTripVehicleId(params.tripId);
  const originalTotalValue = round2(params.fueling.totalValue);

  await ensureMutation(
    supabase
      .from("fuelings")
      .update({
        station: params.fueling.stationName,
        total_value: originalTotalValue,
        liters: params.fueling.liters,
        price_per_liter: calculateFuelingPricePerLiter(
          originalTotalValue,
          params.fueling.liters,
        ),
        km_current: params.fueling.kmCurrent,
        full_tank: params.fueling.fullTank,
        average: 0,
        date: params.fueling.date,
        receipt_url: params.fueling.receiptUrl || null,
        allocated_value: null,
        original_total_value: null,
      })
      .eq("id", params.fuelingId),
    "Falha ao atualizar o abastecimento.",
  );

  await reprocessVehicleFuelings({ userId: params.userId, vehicleId });
  await recalculateVehicleKm(vehicleId);
}

export async function persistFuelingDelete(params: {
  userId: string;
  tripId: string;
  fuelingId: string;
}) {
  const vehicleId = await getTripVehicleId(params.tripId);

  await ensureMutation(
    supabase.from("expenses").delete().eq("source_fueling_id", params.fuelingId),
    "Falha ao limpar rateios ligados a este abastecimento.",
  );
  await ensureMutation(
    supabase.from("fuelings").delete().eq("id", params.fuelingId),
    "Falha ao excluir o abastecimento.",
  );

  await reprocessVehicleFuelings({ userId: params.userId, vehicleId });
  await recalculateVehicleKm(vehicleId);
}