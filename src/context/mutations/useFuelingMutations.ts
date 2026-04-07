import { useCallback } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { AppData, Fueling } from "@/types";
import {
  isOnline,
  addToOfflineQueue,
} from "@/lib/offlineQueue";
import {
  getNumericWarnings,
  validateKmByContext,
  validatePositiveNumber,
} from "@/lib/fieldValidation";
import { calculateFuelingPricePerLiter } from "@/lib/fueling";
import { toast } from "@/hooks/use-toast";
import {
  showActionSuccess,
  showActionError,
  showOfflineSaved,
  showWarnings,
  getVehicleTimelineKms,
  persistFuelingAdd,
  persistFuelingUpdate,
  persistFuelingDelete,
} from "./helpers";

function validateFuelingInputs(f: {
  totalValue: number;
  liters: number;
  kmCurrent: number;
}): boolean {
  const totalValidation = validatePositiveNumber(f.totalValue, "Valor total");
  const litersValidation = validatePositiveNumber(f.liters, "Litros");
  const kmValidation = validatePositiveNumber(f.kmCurrent, "KM atual", true);

  if (!totalValidation.isValid || !litersValidation.isValid || !kmValidation.isValid) {
    const message =
      totalValidation.message || litersValidation.message || kmValidation.message;
    showActionError("Não foi possível salvar agora", message);
    return false;
  }
  return true;
}

interface FuelingMutationsParams {
  user: User | null;
  data: AppData;
  fetchData: (options?: { throwOnError?: boolean }) => Promise<void>;
}

export function useFuelingMutations({ user, data, fetchData }: FuelingMutationsParams) {
  const addFueling = useCallback(
    async (
      tripId: string,
      f: Omit<Fueling, "id" | "tripId" | "pricePerLiter" | "average">,
    ) => {
      if (!user) throw new Error("Usuário não autenticado. Faça login novamente.");

      if (!validateFuelingInputs(f)) return;

      const fuelingId = crypto.randomUUID();
      const pricePerLiter = calculateFuelingPricePerLiter(f.totalValue, f.liters);

      if (!isOnline()) {
        addToOfflineQueue({
          type: "addFueling",
          payload: {
            id: fuelingId,
            trip_id: tripId,
            station: f.stationName,
            total_value: f.totalValue,
            liters: f.liters,
            price_per_liter: pricePerLiter,
            km_current: f.kmCurrent,
            full_tank: f.fullTank,
            average: 0,
            date: f.date,
            receipt_url: f.receiptUrl || null,
          },
        });
        showOfflineSaved("Abastecimento salvo");
        return;
      }

      const trip = data.trips.find((t) => t.id === tripId);
      const vehicleId = trip?.vehicleId || "";

      if (vehicleId) {
        const timelineKms = await getVehicleTimelineKms(vehicleId);
        const kmCheck = validateKmByContext(
          f.kmCurrent,
          "KM do abastecimento",
          timelineKms,
        );
        if (!kmCheck.isValid) {
          toast({
            title: "KM incoerente para abastecimento",
            description: kmCheck.message,
            variant: "destructive",
          });
          return;
        }
        showWarnings(kmCheck.warnings);
      }

      showWarnings(
        getNumericWarnings({
          totalValue: f.totalValue,
          liters: f.liters,
          pricePerLiter,
        }),
      );

      try {
        await persistFuelingAdd({
          userId: user.id,
          tripId,
          fuelingId,
          fueling: {
            stationName: f.stationName,
            totalValue: f.totalValue,
            liters: f.liters,
            kmCurrent: f.kmCurrent,
            date: f.date,
            fullTank: f.fullTank,
            receiptUrl: f.receiptUrl,
          },
        });
        await fetchData();
        showActionSuccess(
          "Abastecimento salvo",
          "O custo, a média e os rateios ligados a este tanque foram revisados.",
        );
      } catch (error) {
        showActionError(
          "Não foi possível salvar o abastecimento",
          error instanceof Error ? error.message : "Tenta novamente.",
        );
      }
    },
    [user, data.trips, fetchData],
  );

  const updateFueling = useCallback(
    async (
      tripId: string,
      fuelingId: string,
      f: Omit<Fueling, "id" | "tripId" | "pricePerLiter" | "average">,
    ) => {
      if (!user) throw new Error("Usuário não autenticado. Faça login novamente.");

      if (!validateFuelingInputs(f)) return;
      const pricePerLiter = calculateFuelingPricePerLiter(f.totalValue, f.liters);
      const trip = data.trips.find((t) => t.id === tripId);
      const vehicleId = trip?.vehicleId || "";
      if (vehicleId) {
        const timelineKms = await getVehicleTimelineKms(vehicleId, {
          fuelingId,
        });
        const kmCheck = validateKmByContext(
          f.kmCurrent,
          "KM do abastecimento",
          timelineKms,
        );
        if (!kmCheck.isValid) {
          toast({
            title: "KM incoerente para abastecimento",
            description: kmCheck.message,
            variant: "destructive",
          });
          return;
        }
        showWarnings(kmCheck.warnings);
      }

      showWarnings(
        getNumericWarnings({
          totalValue: f.totalValue,
          liters: f.liters,
          pricePerLiter,
        }),
      );

      if (!isOnline()) {
        addToOfflineQueue({
          type: "updateFueling",
          payload: {
            id: fuelingId,
            trip_id: tripId,
            station: f.stationName,
            total_value: f.totalValue,
            liters: f.liters,
            price_per_liter: pricePerLiter,
            km_current: f.kmCurrent,
            full_tank: f.fullTank,
            average: 0,
            date: f.date,
            receipt_url: f.receiptUrl || null,
          },
        });
        showOfflineSaved("Abastecimento atualizado");
        return;
      }

      try {
        await persistFuelingUpdate({
          userId: user.id,
          tripId,
          fuelingId,
          fueling: {
            stationName: f.stationName,
            totalValue: f.totalValue,
            liters: f.liters,
            kmCurrent: f.kmCurrent,
            date: f.date,
            fullTank: f.fullTank,
            receiptUrl: f.receiptUrl,
          },
        });
        await fetchData();
        showActionSuccess(
          "Abastecimento atualizado",
          "O sistema refez média, rateio e impacto financeiro deste abastecimento.",
        );
      } catch (error) {
        showActionError(
          "Não foi possível atualizar o abastecimento",
          error instanceof Error ? error.message : "Tenta novamente.",
        );
      }
    },
    [user, data.trips, fetchData],
  );

  const deleteFueling = useCallback(
    async (tripId: string, fuelingId: string) => {
      if (!user) throw new Error("Usuário não autenticado. Faça login novamente.");
      if (!isOnline()) {
        addToOfflineQueue({
          type: "deleteFueling",
          payload: { id: fuelingId, trip_id: tripId },
        });
        showOfflineSaved("Abastecimento excluído");
        return;
      }

      try {
        await persistFuelingDelete({
          userId: user.id,
          tripId,
          fuelingId,
        });
        await fetchData();
        showActionSuccess(
          "Abastecimento excluído",
          "Os ajustes de custo, média, rateio e odômetro foram refeitos.",
        );
      } catch (error) {
        showActionError(
          "Não foi possível excluir o abastecimento",
          error instanceof Error ? error.message : "Tenta novamente.",
        );
      }
    },
    [fetchData, user],
  );

  return { addFueling, updateFueling, deleteFueling };
}
