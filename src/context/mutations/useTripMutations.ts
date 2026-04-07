import { useCallback } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { AppData, Trip, TripStatus } from "@/types";
import {
  isOnline,
  addToOfflineQueue,
} from "@/lib/offlineQueue";
import {
  validatePositiveNumber,
  validateKmByContext,
} from "@/lib/fieldValidation";
import {
  getTripMaxRealKm,
  getTripStartKm,
  getTripPendingPlannedFreights,
  showActionSuccess,
  showActionNotice,
  showActionError,
  showOfflineSaved,
  showWarnings,
  recalculateVehicleKm,
  getVehicleTimelineKms,
} from "./helpers";

interface TripMutationsParams {
  user: User | null;
  data: AppData;
  fetchData: (options?: { throwOnError?: boolean }) => Promise<void>;
  updateVehicleKm: (vehicleId: string, km: number) => Promise<void>;
}

export function useTripMutations({ user, data, fetchData, updateVehicleKm }: TripMutationsParams) {
  const addTrip = useCallback(
    async (vehicleId: string): Promise<Trip> => {
      if (!user) throw new Error("Usuário não autenticado. Faça login novamente.");
      const existingActive = data.trips.find(
        (t) => t.vehicleId === vehicleId && t.status === "open",
      );
      if (existingActive)
        throw new Error("Este veículo já possui uma viagem em andamento.");
      const { data: inserted, error } = await supabase
        .from("trips")
        .insert({
          user_id: user.id,
          vehicle_id: vehicleId,
          status: "open",
        })
        .select()
        .single();
      if (error || !inserted)
        throw new Error(error?.message || "Failed to create trip");
      const trip: Trip = {
        id: inserted.id,
        vehicleId: inserted.vehicle_id,
        status: inserted.status as TripStatus,
        freights: [],
        fuelings: [],
        expenses: [],
        personalExpenses: [],
        createdAt: inserted.created_at,
        finishedAt: inserted.finished_at,
        estimatedDistance: inserted.estimated_distance || 0,
      };
      await fetchData();
      return trip;
    },
    [user, data.trips, fetchData],
  );

  const finishTrip = useCallback(
    async (
      id: string,
      options?: {
        arrivalKm?: number;
        allowPendingPlanned?: boolean;
      },
    ): Promise<{
      autoCompletedFreightId?: string | null;
      pendingPlannedFreights?: number;
    }> => {
      const trip = data.trips.find((t) => t.id === id);
      const arrivalKm = options?.arrivalKm;
      const allowPendingPlanned = options?.allowPendingPlanned ?? false;

      if (!trip) {
        throw new Error("Trip not found");
      }

      if (trip.freights.length === 0) {
        showActionError(
          "Não foi possível finalizar a viagem",
          "Adicione pelo menos 1 frete antes de finalizar a viagem.",
        );
        throw new Error("Trip must have at least 1 freight");
      }

      const activeFreight =
        trip.freights.find((freight) => freight.status === "in_progress") ??
        null;
      const pendingPlannedFreights = getTripPendingPlannedFreights(trip);

      if (pendingPlannedFreights.length > 0 && !allowPendingPlanned) {
        showActionNotice(
          "Tem trecho não iniciado nesta viagem",
          pendingPlannedFreights.length === 1
            ? "Revise esse trecho antes de fechar ou confirme que ele deve ficar fora do consolidado final."
            : `Existem ${pendingPlannedFreights.length} trechos não iniciados. Confirme o fechamento para deixar esses trechos fora do consolidado final.`,
        );
        return {
          autoCompletedFreightId: activeFreight?.id ?? null,
          pendingPlannedFreights: pendingPlannedFreights.length,
        };
      }

      const vehicle = data.vehicles.find((item) => item.id === trip.vehicleId);
      const minOperationalKm = getTripMaxRealKm(trip, vehicle?.currentKm || 0);
      const tripStartKm = getTripStartKm(trip);

      if (arrivalKm != null) {
        const arrivalValidation = validatePositiveNumber(
          arrivalKm,
          "KM de chegada",
          true,
        );
        if (!arrivalValidation.isValid) {
          showActionError(
            "Não foi possível finalizar a viagem",
            arrivalValidation.message,
          );
          return {
            autoCompletedFreightId: activeFreight?.id ?? null,
            pendingPlannedFreights: pendingPlannedFreights.length,
          };
        }

        if (arrivalKm < minOperationalKm) {
          const referenceLabel =
            minOperationalKm === (vehicle?.currentKm || 0)
              ? "odômetro atual do veículo"
              : "maior KM real já lançado nesta operação";
          showActionError(
            "Não foi possível finalizar a viagem",
            `O KM de chegada não pode ficar abaixo de ${minOperationalKm.toLocaleString("pt-BR")} km, que é o ${referenceLabel}.`,
          );
          return {
            autoCompletedFreightId: activeFreight?.id ?? null,
            pendingPlannedFreights: pendingPlannedFreights.length,
          };
        }

        const vehicleTimelineKms = await getVehicleTimelineKms(trip.vehicleId);
        const kmContextValidation = validateKmByContext(
          arrivalKm,
          "KM de chegada",
          vehicleTimelineKms,
        );
        if (!kmContextValidation.isValid) {
          showActionError(
            "Não foi possível finalizar a viagem",
            kmContextValidation.message,
          );
          return {
            autoCompletedFreightId: activeFreight?.id ?? null,
            pendingPlannedFreights: pendingPlannedFreights.length,
          };
        }

        if (kmContextValidation.warnings.length > 0) {
          showWarnings(kmContextValidation.warnings);
        }
      }

      if (!isOnline()) {
        addToOfflineQueue({
          type: "finishTrip",
          payload: {
            tripId: id,
            arrivalKm,
            vehicleId: trip.vehicleId,
            activeFreightId: activeFreight?.id ?? null,
            finalTripDistance:
              arrivalKm != null && tripStartKm != null
                ? Math.max(arrivalKm - tripStartKm, 0)
                : trip.estimatedDistance,
          },
        });
        showOfflineSaved("Viagem finalizada");
        return {
          autoCompletedFreightId: activeFreight?.id ?? null,
          pendingPlannedFreights: pendingPlannedFreights.length,
        };
      }

      if (activeFreight?.id) {
        await supabase
          .from("freights")
          .update({ status: "completed" })
          .eq("id", activeFreight.id);
      }

      const finalTripDistance =
        arrivalKm != null && tripStartKm != null
          ? Math.max(arrivalKm - tripStartKm, 0)
          : trip.estimatedDistance;

      await supabase
        .from("trips")
        .update({
          status: "finished",
          finished_at: new Date().toISOString(),
          estimated_distance: finalTripDistance,
        })
        .eq("id", id);
      if (arrivalKm != null) {
        await updateVehicleKm(trip.vehicleId, arrivalKm);
      } else {
        await fetchData();
      }
      showActionSuccess(
        "Viagem finalizada",
        pendingPlannedFreights.length > 0
          ? activeFreight?.id
            ? "Frete em andamento concluído. Trechos não iniciados ficaram fora do consolidado final da viagem."
            : "Trechos não iniciados ficaram fora do consolidado final da viagem."
          : activeFreight?.id
            ? "Frete em andamento concluído junto com a viagem."
            : "Fechamento concluído com o consolidado final da viagem.",
      );
      return {
        autoCompletedFreightId: activeFreight?.id ?? null,
        pendingPlannedFreights: pendingPlannedFreights.length,
      };
    },
    [data.trips, data.vehicles, fetchData, updateVehicleKm],
  );

  const deleteTrip = useCallback(
    async (id: string) => {
      const trip = data.trips.find((t) => t.id === id);
      const vehicleId = trip?.vehicleId;
      await supabase.from("trips").delete().eq("id", id);
      if (vehicleId) {
        await recalculateVehicleKm(vehicleId);
      }
      await fetchData();
    },
    [data.trips, fetchData],
  );

  const getActiveTrips = useCallback(
    () => data.trips.filter((t) => t.status === "open"),
    [data.trips],
  );

  return { addTrip, finishTrip, deleteTrip, getActiveTrips };
}