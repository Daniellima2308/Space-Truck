import { useCallback } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { AppData, Freight } from "@/types";
import {
  isOnline,
  addToOfflineQueue,
} from "@/lib/offlineQueue";
import {
  getNumericWarnings,
  validateKmByContext,
  validatePercent,
  validatePositiveNumber,
} from "@/lib/fieldValidation";
import { getFreightStatusForInsert } from "@/lib/freightStatus";
import { StartFreightResult, FreightUpdateResult } from "@/context/app-context";
import {
  showActionSuccess,
  showActionNotice,
  showActionError,
  showOfflineSaved,
  showWarnings,
  buildRouteFailureDetails,
  resolveFreightEstimatedDistance,
  refreshFreightEstimatedDistance,
  recalculateVehicleKm,
  getVehicleTimelineKms,
  recalculateTripEstimatedDistance,
  getFreightCreationFeedback,
} from "./helpers";

interface FreightMutationsParams {
  user: User | null;
  data: AppData;
  fetchData: (options?: { throwOnError?: boolean }) => Promise<void>;
}

export function useFreightMutations({ user, data, fetchData }: FreightMutationsParams) {
  const addFreight = useCallback(
    async (
      tripId: string,
      f: Omit<
        Freight,
        "id" | "tripId" | "commissionValue" | "status" | "estimatedDistance"
      >,
    ) => {
      if (!user) throw new Error("Usuário não autenticado. Faça login novamente.");

      const kmValidation = validatePositiveNumber(
        f.kmInitial,
        "KM inicial",
        true,
      );
      const grossValidation = validatePositiveNumber(
        f.grossValue,
        "Valor bruto",
      );
      const percentValidation = validatePercent(
        f.commissionPercent,
        "Comissão",
      );

      if (
        !kmValidation.isValid ||
        !grossValidation.isValid ||
        !percentValidation.isValid
      ) {
        const message =
          kmValidation.message ||
          grossValidation.message ||
          percentValidation.message;
        throw new Error(message || "Dados do frete inválidos.");
      }

      const trip = data.trips.find((t) => t.id === tripId);
      const vehicleId = trip?.vehicleId;
      if (vehicleId) {
        const timelineKms = await getVehicleTimelineKms(vehicleId);
        const kmCheck = validateKmByContext(
          f.kmInitial,
          "KM inicial",
          timelineKms,
        );
        if (!kmCheck.isValid) {
          throw new Error(
            kmCheck.message || "KM incoerente para este veículo.",
          );
        }
        showWarnings(kmCheck.warnings);
      }

      showWarnings(
        getNumericWarnings({
          totalValue: f.grossValue,
          commissionPercent: f.commissionPercent,
        }),
      );

      const commissionValue = f.grossValue * (f.commissionPercent / 100);
      const freightStatus = getFreightStatusForInsert(trip?.freights || []);
      const freightFeedback = getFreightCreationFeedback(freightStatus);

      if (!isOnline()) {
        addToOfflineQueue({
          type: "addFreight",
          payload: {
            trip_id: tripId,
            origin: f.origin,
            destination: f.destination,
            km_initial: f.kmInitial,
            km_final: 0,
            gross_value: f.grossValue,
            commission_percent: f.commissionPercent,
            commission_value: commissionValue,
            status: freightStatus,
            estimated_distance: 0,
          },
        });
        if (freightFeedback.variant === "notice") {
          showActionNotice(freightFeedback.title, freightFeedback.description);
        } else {
          showOfflineSaved(freightFeedback.title);
        }
        return;
      }

      const { estimatedDistance, diagnostic: distanceDiagnostic } =
        await resolveFreightEstimatedDistance({
          origin: f.origin,
          destination: f.destination,
          userId: user.id,
        });

      if (distanceDiagnostic.distanceKm === null) {
        const description = buildRouteFailureDetails({
          reason: distanceDiagnostic.reason,
        });

        showActionNotice("Previsão ainda em ajuste", description);

        console.error("Falha no diagnóstico de rota ao criar frete", {
          tripId,
          origin: f.origin,
          destination: f.destination,
          reason: distanceDiagnostic.reason,
          originQueryUsed: distanceDiagnostic.originQueryUsed,
          destinationQueryUsed: distanceDiagnostic.destinationQueryUsed,
        });
      }

      const { error: freightInsertError } = await supabase
        .from("freights")
        .insert({
          trip_id: tripId,
          user_id: user.id,
          origin: f.origin,
          destination: f.destination,
          km_initial: f.kmInitial,
          km_final: 0,
          gross_value: f.grossValue,
          commission_percent: f.commissionPercent,
          commission_value: commissionValue,
          status: freightStatus,
          estimated_distance: estimatedDistance,
        });
      if (freightInsertError)
        throw new Error(
          freightInsertError.message || "Falha ao salvar o frete.",
        );
      if (vehicleId) {
        await recalculateVehicleKm(vehicleId);
      }
      await recalculateTripEstimatedDistance(tripId);
      await fetchData();
      if (freightFeedback.variant === "notice") {
        showActionNotice(freightFeedback.title, freightFeedback.description);
      } else {
        showActionSuccess(freightFeedback.title, freightFeedback.description);
      }
    },
    [user, data.trips, fetchData],
  );

  const deleteFreight = useCallback(
    async (tripId: string, freightId: string) => {
      const trip = data.trips.find((t) => t.id === tripId);
      const vehicleId = trip?.vehicleId;
      const freightToDelete =
        trip?.freights.find((freight) => freight.id === freightId) ?? null;

      if (!isOnline()) {
        addToOfflineQueue({
          type: "deleteFreight",
          payload: { id: freightId },
        });
        showOfflineSaved("Frete excluído");
        return;
      }

      await supabase.from("freights").delete().eq("id", freightId);
      await recalculateTripEstimatedDistance(tripId);
      if (vehicleId) {
        await recalculateVehicleKm(vehicleId);
      }
      await fetchData();

      if (freightToDelete?.status === "planned") {
        showActionNotice(
          "Próximo frete excluído",
          "A fila da viagem foi atualizada sem mexer no KM atual do veículo.",
        );
        return;
      }

      if (freightToDelete?.status === "completed") {
        showActionNotice(
          "Frete concluído excluído",
          "Histórico e odômetro foram recalculados com base no que restou na operação.",
        );
        return;
      }

      showActionNotice(
        "Frete em andamento excluído",
        "A viagem ficou sem trecho ativo até você iniciar outro frete.",
      );
    },
    [data.trips, fetchData],
  );

  const startFreight = useCallback(
    async (tripId: string, freightId: string): Promise<StartFreightResult> => {
      const trip = data.trips.find((candidate) => candidate.id === tripId);
      const activeFreight =
        trip?.freights.find(
          (freight) =>
            freight.status === "in_progress" && freight.id !== freightId,
        ) ?? null;

      if (activeFreight) {
        return {
          status: "blocked_active_freight",
          activeFreightId: activeFreight.id,
        };
      }

      if (!isOnline()) {
        addToOfflineQueue({
          type: "startFreight",
          payload: {
            tripId: tripId,
            freightId: freightId,
          },
        });
        showOfflineSaved("Frete iniciado");
        return { status: "started" };
      }

      await supabase
        .from("freights")
        .update({ status: "in_progress" })
        .eq("id", freightId);
      await fetchData();
      showActionSuccess(
        "Frete iniciado",
        "Este trecho agora está em andamento na viagem.",
      );
      return { status: "started" };
    },
    [data.trips, fetchData],
  );

  const completeFreight = useCallback(
    async (
      tripId: string,
      freightId: string,
      option:
        | "complete_only"
        | "start_next_if_planned" = "start_next_if_planned",
    ): Promise<{ promotedFreightId?: string | null }> => {
      if (!isOnline()) {
        addToOfflineQueue({
          type: "completeFreight",
          payload: {
            tripId: tripId,
            freightId: freightId,
            option: option,
          },
        });
        showOfflineSaved("Frete concluído");
        return { promotedFreightId: null };
      }

      await supabase
        .from("freights")
        .update({ status: "completed" })
        .eq("id", freightId);

      let promotedFreightId: string | null = null;

      if (option === "start_next_if_planned") {
        const { data: nextPlanned } = await supabase
          .from("freights")
          .select("id")
          .eq("trip_id", tripId)
          .eq("status", "planned")
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (nextPlanned?.id) {
          await supabase
            .from("freights")
            .update({ status: "in_progress" })
            .eq("id", nextPlanned.id);
          promotedFreightId = nextPlanned.id;
        }
      }

      await fetchData();
      return { promotedFreightId };
    },
    [fetchData],
  );

  const updateFreight = useCallback(
    async (
      tripId: string,
      freightId: string,
      f: Omit<
        Freight,
        "id" | "tripId" | "commissionValue" | "status" | "estimatedDistance"
      >,
      options?: { forceRouteRefresh?: boolean; suppressSuccessToast?: boolean },
    ): Promise<FreightUpdateResult> => {
      if (!user) {
        return {
          status: "blocked",
          userMessage: "Faça login novamente para revisar este frete.",
        };
      }

      const kmValidation = validatePositiveNumber(
        f.kmInitial,
        "KM inicial",
        true,
      );
      const grossValidation = validatePositiveNumber(
        f.grossValue,
        "Valor bruto",
      );
      const percentValidation = validatePercent(
        f.commissionPercent,
        "Comissão",
      );
      if (
        !kmValidation.isValid ||
        !grossValidation.isValid ||
        !percentValidation.isValid
      ) {
        const message =
          kmValidation.message ||
          grossValidation.message ||
          percentValidation.message;
        showActionError("Não foi possível salvar agora", message);
        return {
          status: "blocked",
          userMessage: message || "Não foi possível salvar agora.",
        };
      }

      const trip = data.trips.find((t) => t.id === tripId);
      const vehicleId = trip?.vehicleId;

      if (vehicleId) {
        const timelineKms = await getVehicleTimelineKms(vehicleId, {
          freightId,
        });
        const kmCheck = validateKmByContext(
          f.kmInitial,
          "KM inicial",
          timelineKms,
        );
        if (!kmCheck.isValid) {
          throw new Error(
            kmCheck.message || "KM incoerente para este veículo.",
          );
        }
        showWarnings(kmCheck.warnings);
      }

      showWarnings(
        getNumericWarnings({
          totalValue: f.grossValue,
          commissionPercent: f.commissionPercent,
        }),
      );

      const commissionValue = f.grossValue * (f.commissionPercent / 100);

      if (!isOnline()) {
        addToOfflineQueue({
          type: "updateFreight",
          payload: {
            tripId: tripId,
            freightId: freightId,
            origin: f.origin,
            destination: f.destination,
            km_initial: f.kmInitial,
            gross_value: f.grossValue,
            commission_percent: f.commissionPercent,
            commission_value: commissionValue,
            forceRouteRefresh: options?.forceRouteRefresh || false,
          },
        });
        showOfflineSaved("Frete atualizado");
        return {
          status: "updated",
        };
      }

      const { data: currentFreight, error: currentFreightError } =
        await supabase
          .from("freights")
          .select("origin, destination, estimated_distance, status, km_initial")
          .eq("id", freightId)
          .single();

      if (currentFreightError) {
        throw new Error(
          currentFreightError.message ||
            "Falha ao carregar dados atuais do frete.",
        );
      }

      if (
        currentFreight.status === "completed" &&
        currentFreight.km_initial !== f.kmInitial
      ) {
        const userMessage =
          "Frete concluído não pode ter o KM inicial alterado no fluxo normal.";
        showActionError("Não foi possível salvar agora", userMessage);
        return {
          status: "blocked",
          userMessage,
        };
      }

      const routeChanged =
        currentFreight.origin !== f.origin ||
        currentFreight.destination !== f.destination;
      const shouldRefreshRoute =
        routeChanged || Boolean(options?.forceRouteRefresh);
      let nextEstimatedDistance = currentFreight.estimated_distance || 0;

      if (shouldRefreshRoute) {
        const { estimatedDistance, diagnostic: distanceDiagnostic } =
          await refreshFreightEstimatedDistance({
            origin: f.origin,
            destination: f.destination,
            userId: user.id,
          });

        if (distanceDiagnostic.distanceKm === null) {
          const description = buildRouteFailureDetails({
            reason: distanceDiagnostic.reason,
          });

          console.error("Falha no diagnóstico de rota ao editar frete", {
            tripId,
            freightId,
            origin: f.origin,
            destination: f.destination,
            reason: distanceDiagnostic.reason,
            originQueryUsed: distanceDiagnostic.originQueryUsed,
            destinationQueryUsed: distanceDiagnostic.destinationQueryUsed,
          });

          if (routeChanged) {
            const userMessage = `Rota salva, mas a previsão ainda não foi liberada. ${description}`;
            if (!options?.suppressSuccessToast) {
              showActionNotice("Previsão ainda em ajuste", userMessage);
            }
          }
          await supabase
            .from("freights")
            .update({
              origin: f.origin,
              destination: f.destination,
              km_initial: f.kmInitial,
              gross_value: f.grossValue,
              commission_percent: f.commissionPercent,
              commission_value: commissionValue,
              estimated_distance: nextEstimatedDistance,
            })
            .eq("id", freightId);
          await recalculateTripEstimatedDistance(tripId);
          if (vehicleId) {
            await recalculateVehicleKm(vehicleId);
          }
          await fetchData();

          return {
            status: "saved_without_route",
            userMessage: `Rota salva, mas a previsão ainda não foi liberada. ${description}`,
          };
        }

        nextEstimatedDistance = estimatedDistance;
      }

      await supabase
        .from("freights")
        .update({
          origin: f.origin,
          destination: f.destination,
          km_initial: f.kmInitial,
          gross_value: f.grossValue,
          commission_percent: f.commissionPercent,
          commission_value: commissionValue,
          estimated_distance: nextEstimatedDistance,
        })
        .eq("id", freightId);
      await recalculateTripEstimatedDistance(tripId);
      if (vehicleId) {
        await recalculateVehicleKm(vehicleId);
      }
      await fetchData();

      if (!options?.suppressSuccessToast) {
        showActionSuccess("Frete atualizado");
      }

      return {
        status: shouldRefreshRoute ? "route_refreshed" : "updated",
      };
    },
    [user, data.trips, fetchData],
  );

  return { addFreight, updateFreight, deleteFreight, startFreight, completeFreight };
}