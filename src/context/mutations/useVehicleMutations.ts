import { useCallback } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { AppData, Vehicle, VehicleOperationProfile, DriverBond } from "@/types";
import { toast } from "@/hooks/use-toast";
import {
  normalizeVehicleProfileForPersistence,
  normalizeVehicleProfileUpdateForPersistence,
} from "@/lib/vehicleOperation";
import {
  validatePositiveNumber,
} from "@/lib/fieldValidation";
import {
  getMaintenanceAlerts,
  checkAndNotifyMaintenance,
} from "@/lib/maintenance";

interface VehicleMutationsParams {
  user: User | null;
  data: AppData;
  fetchData: (options?: { throwOnError?: boolean }) => Promise<void>;
}

export function useVehicleMutations({ user, data, fetchData }: VehicleMutationsParams) {
  const addVehicle = useCallback(
    async (v: Omit<Vehicle, "id">) => {
      if (!user) throw new Error("Usuário não autenticado. Faça login novamente.");

      const normalizedProfile = normalizeVehicleProfileForPersistence({
        operationProfile: v.operationProfile,
        driverBond: v.driverBond,
        defaultCommissionPercent: v.defaultCommissionPercent,
      });

      const { error } = await supabase.from("vehicles").insert({
        user_id: user.id,
        brand: v.brand,
        model: v.model,
        year: v.year,
        plate: v.plate,
        is_fleet_owner: v.isFleetOwner || false,
        driver_name: v.driverName || null,
        current_km: v.currentKm || 0,
        operation_profile: normalizedProfile.operationProfile,
        driver_bond: normalizedProfile.driverBond,
        default_commission_percent: normalizedProfile.defaultCommissionPercent,
      });
      if (error) throw new Error(error.message || "Falha ao salvar o veículo.");

      await fetchData({ throwOnError: true });
    },
    [user, fetchData],
  );

  const updateVehicle = useCallback(
    async (id: string, v: Partial<Omit<Vehicle, "id">>) => {
      const updateData: {
        brand?: string;
        model?: string;
        year?: number;
        plate?: string;
        is_fleet_owner?: boolean;
        driver_name?: string | null;
        current_km?: number;
        operation_profile?: VehicleOperationProfile;
        driver_bond?: DriverBond | null;
        default_commission_percent?: number | null;
      } = {};
      if (v.brand !== undefined) updateData.brand = v.brand;
      if (v.model !== undefined) updateData.model = v.model;
      if (v.year !== undefined) updateData.year = v.year;
      if (v.plate !== undefined) updateData.plate = v.plate;
      if (v.isFleetOwner !== undefined)
        updateData.is_fleet_owner = v.isFleetOwner;
      if (v.driverName !== undefined) updateData.driver_name = v.driverName;
      if (v.currentKm !== undefined) updateData.current_km = v.currentKm;

      if (
        v.operationProfile !== undefined ||
        v.driverBond !== undefined ||
        v.defaultCommissionPercent !== undefined
      ) {
        const currentVehicle = data.vehicles.find(
          (vehicle) => vehicle.id === id,
        );
        const normalizedProfile = normalizeVehicleProfileUpdateForPersistence({
          currentVehicle,
          operationProfile: v.operationProfile,
          driverBond: v.driverBond,
          defaultCommissionPercent: v.defaultCommissionPercent,
        });

        updateData.operation_profile = normalizedProfile.operationProfile;
        updateData.driver_bond = normalizedProfile.driverBond;
        updateData.default_commission_percent =
          normalizedProfile.defaultCommissionPercent;
      }
      const { error } = await supabase
        .from("vehicles")
        .update(updateData)
        .eq("id", id);
      if (error)
        throw new Error(error.message || "Falha ao atualizar o veículo.");

      await fetchData({ throwOnError: true });
    },
    [data.vehicles, fetchData],
  );

  const deleteVehicle = useCallback(
    async (id: string) => {
      const { error } = await supabase.from("vehicles").delete().eq("id", id);
      if (error)
        throw new Error(error.message || "Falha ao excluir o veículo.");

      await fetchData({ throwOnError: true });
    },
    [fetchData],
  );

  const updateVehicleKm = useCallback(
    async (vehicleId: string, km: number) => {
      const kmValidation = validatePositiveNumber(km, "KM", true);
      if (!kmValidation.isValid) {
        toast({
          title: "Não deu para salvar",
          description: kmValidation.message,
          variant: "destructive",
        });
        return;
      }

      await supabase
        .from("vehicles")
        .update({ current_km: km })
        .eq("id", vehicleId);
      await fetchData();
      const updatedVehicles = data.vehicles.map((v) =>
        v.id === vehicleId ? { ...v, currentKm: km } : v,
      );
      const alerts = getMaintenanceAlerts(
        updatedVehicles,
        data.maintenanceServices,
      );
      if (alerts.length > 0) checkAndNotifyMaintenance(alerts);
    },
    [data.vehicles, data.maintenanceServices, fetchData],
  );

  return { addVehicle, updateVehicle, deleteVehicle, updateVehicleKm };
}
