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

export type FreightEditableInput = Omit<
  Freight,
  "id" | "tripId" | "commissionValue" | "status" | "estimatedDistance" | "createdAt"
>;

type NormalizedReceivableInput = ReturnType<typeof normalizeReceivableInput>;

function assertFreightUpdateSucceeded(
  result: { error: { message?: string } | null; status?: number | null },
  contextMessage: string,
) {
  if (!result.error) return;
  console.error(contextMessage, result.error);
  throw new Error(result.error.message || "Falha ao atualizar frete.");
}

function normalizeReceivableInput(params: {
  amountReceived: unknown;
  advanceAmount?: unknown;
  payerName?: unknown;
  deliveryProofStatus?: unknown;
  balanceReleaseMode?: unknown;
  balanceAdjustments?: unknown;
  paymentDueDate?: unknown;
}): {
  amountReceived: number;
  advanceAmount: number;
  payerName?: string;
  deliveryProofStatus: "not_required" | "pending_send" | "sent" | "confirmed";
  balanceReleaseMode: "none" | "proof_photo" | "physical_proof" | "agreed_deadline" | "direct_delivery";
  balanceAdjustments: Array<{ type: "discount" | "increase"; amount: number; note?: string }>;
  paymentDueDate?: string;
} {
  const parsedAmount =
    typeof params.amountReceived === "number"
      ? params.amountReceived
      : Number(params.amountReceived ?? 0);

  if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
    throw new Error("Valor recebido inválido. Informe um valor maior ou igual a zero.");
  }

  const parsedAdvance =
    typeof params.advanceAmount === "number"
      ? params.advanceAmount
      : Number(params.advanceAmount ?? 0);
  if (!Number.isFinite(parsedAdvance) || parsedAdvance < 0) {
    throw new Error("Adiantamento inválido. Informe um valor maior ou igual a zero.");
  }

  const payerName =
    typeof params.payerName === "string" && params.payerName.trim() !== ""
      ? params.payerName.trim()
      : undefined;

  const validProofStatuses = new Set(["not_required", "pending_send", "sent", "confirmed"]);
  const deliveryProofStatus =
    typeof params.deliveryProofStatus === "string" &&
    validProofStatuses.has(params.deliveryProofStatus)
      ? (params.deliveryProofStatus as "not_required" | "pending_send" | "sent" | "confirmed")
      : "not_required";

  const validReleaseModes = new Set([
    "none",
    "proof_photo",
    "physical_proof",
    "agreed_deadline",
    "direct_delivery",
  ]);
  const balanceReleaseMode =
    typeof params.balanceReleaseMode === "string" &&
    validReleaseModes.has(params.balanceReleaseMode)
      ? (params.balanceReleaseMode as "none" | "proof_photo" | "physical_proof" | "agreed_deadline" | "direct_delivery")
      : "none";

  const balanceAdjustments: Array<{ type: "discount" | "increase"; amount: number; note?: string }> = Array.isArray(params.balanceAdjustments)
    ? (params.balanceAdjustments
      .map((item) => {
        const rawType = item && typeof item === "object" ? (item as { type?: unknown }).type : undefined;
        const rawAmount = item && typeof item === "object" ? (item as { amount?: unknown }).amount : undefined;
        const rawNote = item && typeof item === "object" ? (item as { note?: unknown }).note : undefined;
        if (rawAmount == null || rawAmount === "") return null;
        const amount = typeof rawAmount === "number" ? rawAmount : Number(rawAmount ?? 0);
        if (!Number.isFinite(amount) || amount < 0) return null;
        if (rawType !== "discount" && rawType !== "increase") return null;
        return {
          type: rawType as "discount" | "increase",
          amount,
          ...(typeof rawNote === "string" && rawNote.trim() !== "" ? { note: rawNote.trim() } : {}),
        };
      })
      .filter(Boolean) as Array<{ type: "discount" | "increase"; amount: number; note?: string }>)
    : [];
  if (
    process.env.NODE_ENV !== "production" &&
    Array.isArray(params.balanceAdjustments) &&
    balanceAdjustments.length !== params.balanceAdjustments.length
  ) {
    console.warn(
      "[freight-receivable] balanceAdjustments inválidos foram descartados durante a normalização.",
      {
        received: params.balanceAdjustments,
        accepted: balanceAdjustments,
      },
    );
  }

  if (params.paymentDueDate != null && params.paymentDueDate !== "") {
    if (typeof params.paymentDueDate !== "string") {
      throw new Error("Vencimento previsto inválido. Use o formato AAAA-MM-DD.");
    }

    const dateMatch = params.paymentDueDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!dateMatch) {
      throw new Error("Vencimento previsto inválido. Use o formato AAAA-MM-DD.");
    }

    const [, yearRaw, monthRaw, dayRaw] = dateMatch;
    const year = Number(yearRaw);
    const month = Number(monthRaw);
    const day = Number(dayRaw);
    const parsed = new Date(year, month - 1, day);
    const isSameDate =
      parsed.getFullYear() === year &&
      parsed.getMonth() === month - 1 &&
      parsed.getDate() === day;

    if (!isSameDate) {
      throw new Error("Vencimento previsto inválido. Informe uma data existente.");
    }
  }

  return {
    amountReceived: parsedAmount,
    advanceAmount: parsedAdvance,
    payerName,
    deliveryProofStatus,
    balanceReleaseMode,
    balanceAdjustments,
    paymentDueDate:
      typeof params.paymentDueDate === "string" && params.paymentDueDate !== ""
        ? params.paymentDueDate
        : undefined,
  };
}

function buildReceivablePayload(receivable: NormalizedReceivableInput) {
  return {
    payment_due_date: receivable.paymentDueDate ?? null,
    amount_received: receivable.amountReceived,
    advance_amount: receivable.advanceAmount,
    payer_name: receivable.payerName ?? null,
    delivery_proof_status: receivable.deliveryProofStatus,
    balance_release_mode: receivable.balanceReleaseMode,
    balance_adjustments: receivable.balanceAdjustments,
  };
}

function hasOwnField<T extends object>(obj: T, key: keyof T): boolean {
  return key in obj;
}

function resolveReceivableInput(
  freightInput: FreightEditableInput,
  fallback?: {
    paymentDueDate?: string | null;
    amountReceived?: number | null;
    advanceAmount?: number | null;
    payerName?: string | null;
    deliveryProofStatus?: string | null;
    balanceReleaseMode?: string | null;
    balanceAdjustments?: unknown;
  },
): NormalizedReceivableInput {
  return normalizeReceivableInput({
    amountReceived: hasOwnField(freightInput, "amountReceived")
      ? freightInput.amountReceived
      : fallback?.amountReceived,
    advanceAmount: hasOwnField(freightInput, "advanceAmount")
      ? freightInput.advanceAmount
      : fallback?.advanceAmount,
    payerName: hasOwnField(freightInput, "payerName")
      ? freightInput.payerName
      : fallback?.payerName,
    deliveryProofStatus: hasOwnField(freightInput, "deliveryProofStatus")
      ? freightInput.deliveryProofStatus
      : fallback?.deliveryProofStatus,
    balanceReleaseMode: hasOwnField(freightInput, "balanceReleaseMode")
      ? freightInput.balanceReleaseMode
      : fallback?.balanceReleaseMode,
    balanceAdjustments: hasOwnField(freightInput, "balanceAdjustments")
      ? freightInput.balanceAdjustments
      : fallback?.balanceAdjustments,
    paymentDueDate: hasOwnField(freightInput, "paymentDueDate")
      ? freightInput.paymentDueDate
      : fallback?.paymentDueDate,
  });
}

export function useFreightMutations({ user, data, fetchData }: FreightMutationsParams) {
  const addFreight = useCallback(
    async (
      tripId: string,
      f: FreightEditableInput,
    ) => {
      if (!user) throw new Error("Usuário não autenticado. Faça login novamente.");

      const receivable = normalizeReceivableInput({
        amountReceived: f.amountReceived,
        advanceAmount: f.advanceAmount,
        payerName: f.payerName,
        deliveryProofStatus: f.deliveryProofStatus,
        balanceReleaseMode: f.balanceReleaseMode,
        balanceAdjustments: f.balanceAdjustments,
        paymentDueDate: f.paymentDueDate,
      });

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
            ...buildReceivablePayload(receivable),
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
          ...buildReceivablePayload(receivable),
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
      f: FreightEditableInput,
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
      const trip = data.trips.find((t) => t.id === tripId);
      const currentFreightFromState =
        trip?.freights.find((freight) => freight.id === freightId) ?? null;
      let receivable: NormalizedReceivableInput;
      try {
        receivable = resolveReceivableInput(f, {
          paymentDueDate: currentFreightFromState?.paymentDueDate,
          amountReceived: currentFreightFromState?.amountReceived,
          advanceAmount: currentFreightFromState?.advanceAmount,
          payerName: currentFreightFromState?.payerName,
          deliveryProofStatus: currentFreightFromState?.deliveryProofStatus,
          balanceReleaseMode: currentFreightFromState?.balanceReleaseMode,
          balanceAdjustments: currentFreightFromState?.balanceAdjustments,
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Dados de recebimento inválidos.";
        showActionError("Não foi possível salvar agora", message);
        return {
          status: "blocked",
          userMessage: message,
        };
      }
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
            ...buildReceivablePayload(receivable),
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
          .select("origin, destination, estimated_distance, status, km_initial, payment_due_date, amount_received, advance_amount, payer_name, delivery_proof_status, balance_release_mode, balance_adjustments")
          .eq("id", freightId)
          .single();

      if (currentFreightError) {
        throw new Error(
          currentFreightError.message ||
            "Falha ao carregar dados atuais do frete.",
        );
      }

      try {
        receivable = resolveReceivableInput(f, {
          paymentDueDate: currentFreight.payment_due_date,
          amountReceived: currentFreight.amount_received,
          advanceAmount: currentFreight.advance_amount,
          payerName: currentFreight.payer_name,
          deliveryProofStatus: currentFreight.delivery_proof_status,
          balanceReleaseMode: currentFreight.balance_release_mode,
          balanceAdjustments: currentFreight.balance_adjustments,
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Dados de recebimento inválidos.";
        showActionError("Não foi possível salvar agora", message);
        return {
          status: "blocked",
          userMessage: message,
        };
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

          if (routeChanged) {
            const userMessage = `Rota salva, mas a previsão ainda não foi liberada. ${description}`;
            if (!options?.suppressSuccessToast) {
              showActionNotice("Previsão ainda em ajuste", userMessage);
            }
          }
          const fallbackUpdateResult = await supabase
            .from("freights")
            .update({
              origin: f.origin,
              destination: f.destination,
              km_initial: f.kmInitial,
              gross_value: f.grossValue,
              commission_percent: f.commissionPercent,
              commission_value: commissionValue,
              estimated_distance: nextEstimatedDistance,
              ...buildReceivablePayload(receivable),
            })
            .eq("id", freightId);
          assertFreightUpdateSucceeded(
            fallbackUpdateResult,
            "Falha ao salvar frete sem previsão de rota",
          );
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

      const updateResult = await supabase
        .from("freights")
        .update({
          origin: f.origin,
          destination: f.destination,
          km_initial: f.kmInitial,
          gross_value: f.grossValue,
          commission_percent: f.commissionPercent,
          commission_value: commissionValue,
          estimated_distance: nextEstimatedDistance,
          ...buildReceivablePayload(receivable),
        })
        .eq("id", freightId);
      assertFreightUpdateSucceeded(
        updateResult,
        "Falha ao atualizar frete",
      );
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
