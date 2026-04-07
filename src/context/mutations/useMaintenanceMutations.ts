import { useCallback } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { MaintenanceService } from "@/types";
import { toast } from "@/hooks/use-toast";
import {
  validateKmByContext,
  validatePositiveNumber,
} from "@/lib/fieldValidation";
import {
  showWarnings,
  getVehicleTimelineKms,
} from "./helpers";

interface MaintenanceMutationsParams {
  user: User | null;
  fetchData: (options?: { throwOnError?: boolean }) => Promise<void>;
}

export function useMaintenanceMutations({ user, fetchData }: MaintenanceMutationsParams) {
  const addMaintenanceService = useCallback(
    async (s: Omit<MaintenanceService, "id" | "createdAt">) => {
      if (!user) throw new Error("Usuário não autenticado. Faça login novamente.");

      const lastKmValidation = validatePositiveNumber(
        s.lastChangeKm,
        "KM da última troca",
        true,
      );
      const intervalValidation = validatePositiveNumber(
        s.intervalKm,
        "Intervalo de manutenção",
      );

      if (!lastKmValidation.isValid || !intervalValidation.isValid) {
        const message = lastKmValidation.message || intervalValidation.message;
        toast({
          title: "Não deu para salvar a manutenção",
          description: message,
          variant: "destructive",
        });
        return;
      }

      const timelineKms = await getVehicleTimelineKms(s.vehicleId);
      const kmCheck = validateKmByContext(
        s.lastChangeKm,
        "KM da última troca",
        timelineKms,
      );
      if (!kmCheck.isValid) {
        toast({
          title: "KM incoerente para manutenção",
          description: kmCheck.message,
          variant: "destructive",
        });
        return;
      }
      showWarnings(kmCheck.warnings);

      await supabase.from("maintenance_services").insert({
        user_id: user.id,
        vehicle_id: s.vehicleId,
        service_name: s.serviceName,
        last_change_km: s.lastChangeKm,
        interval_km: s.intervalKm,
      });
      await fetchData();
    },
    [user, fetchData],
  );

  const deleteMaintenanceService = useCallback(
    async (id: string) => {
      await supabase.from("maintenance_services").delete().eq("id", id);
      await fetchData();
    },
    [fetchData],
  );

  return { addMaintenanceService, deleteMaintenanceService };
}
