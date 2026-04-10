import React, { useState, useCallback, useEffect } from "react";
import { AppData, MaintenanceService } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/auth-context";
import {
  isOnline,
  getOfflineQueue,
  removeFromQueue,
  setCachedData,
  getCachedData,
} from "@/lib/offlineQueue";
import { toast } from "@/hooks/use-toast";
import { AppContext } from "@/context/app-context";
import {
  mapVehicleRow,
  mapMaintenanceServiceRow,
  buildFreightsMap,
  buildFuelingsMap,
  buildExpensesMap,
  buildPersonalExpensesMap,
  buildTripsFromRows,
} from "@/lib/mappers";
import {
  showActionNotice,
  buildRouteFailureDetails,
  buildOfflineSyncRouteToast,
  resolveFreightEstimatedDistance,
  updateTripEstimatedDistanceBySum,
  recalculateVehicleKm,
  persistFuelingAdd,
  persistFuelingUpdate,
  persistFuelingDelete,
} from "@/context/mutations/helpers";
import { useVehicleMutations } from "@/context/mutations/useVehicleMutations";
import { useTripMutations } from "@/context/mutations/useTripMutations";
import { useFreightMutations } from "@/context/mutations/useFreightMutations";
import { useFuelingMutations } from "@/context/mutations/useFuelingMutations";
import { useExpenseMutations } from "@/context/mutations/useExpenseMutations";
import { useMaintenanceMutations } from "@/context/mutations/useMaintenanceMutations";

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  const [data, setData] = useState<AppData>(
    () =>
      getCachedData<AppData>() || {
        vehicles: [],
        trips: [],
        maintenanceServices: [],
      },
  );
  const [loading, setLoading] = useState(true);
  const [personalExpensesEnabled, setPersonalExpensesEnabledState] =
    useState(false);

  const fetchData = useCallback(
    async (options?: { throwOnError?: boolean }) => {
      if (!user) {
        setData({ vehicles: [], trips: [], maintenanceServices: [] });
        setLoading(false);
        return;
      }

      if (!isOnline()) {
        const cached = getCachedData<AppData>();
        if (cached) setData(cached);
        setLoading(false);
        return;
      }

      try {
        const [
          vehiclesRes,
          tripsRes,
          freightsRes,
          fuelingsRes,
          expensesRes,
          maintRes,
          personalExpRes,
          profileRes,
        ] = await Promise.all([
          supabase
            .from("vehicles")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false }),
          supabase
            .from("trips")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false }),
          supabase
            .from("freights")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: true }),
          supabase
            .from("fuelings")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: true }),
          supabase
            .from("expenses")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: true }),
          supabase
            .from("maintenance_services")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: true }),
          supabase
            .from("personal_expenses")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: true }),
          supabase
            .from("profiles")
            .select("personal_expenses_enabled")
            .eq("user_id", user.id)
            .single(),
        ]);

        if (vehiclesRes.error) throw vehiclesRes.error;
        if (tripsRes.error) throw tripsRes.error;
        if (freightsRes.error) throw freightsRes.error;
        if (fuelingsRes.error) throw fuelingsRes.error;
        if (expensesRes.error) throw expensesRes.error;
        if (maintRes.error) throw maintRes.error;
        if (personalExpRes.error) throw personalExpRes.error;
        if (profileRes.error && profileRes.error.code !== "PGRST116")
          throw profileRes.error;

        if (profileRes.data) {
          const profile = profileRes.data as {
            personal_expenses_enabled: boolean | null;
          };
          setPersonalExpensesEnabledState(
            profile.personal_expenses_enabled || false,
          );
        }

        const vehicles = (vehiclesRes.data || []).map(mapVehicleRow);

        const freightsMap = buildFreightsMap(freightsRes.data || []);
        const fuelingsMap = buildFuelingsMap(fuelingsRes.data || []);
        const expensesMap = buildExpensesMap(expensesRes.data || []);
        const personalExpMap = buildPersonalExpensesMap(personalExpRes.data || []);

        const trips = buildTripsFromRows({
          tripRows: tripsRes.data || [],
          freightsMap,
          fuelingsMap,
          expensesMap,
          personalExpMap,
        });

        const maintenanceServices: MaintenanceService[] = (maintRes.data || []).map(
          mapMaintenanceServiceRow,
        );

        const appData = { vehicles, trips, maintenanceServices };
        setData(appData);
        setCachedData(appData);
      } catch (err) {
        console.error("Error fetching data:", err);
        const cached = getCachedData<AppData>();
        if (cached) setData(cached);
        if (options?.throwOnError) {
          throw err instanceof Error
            ? err
            : new Error("Falha ao recarregar dados.");
        }
      } finally {
        setLoading(false);
      }
    },
    [user],
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Sync offline queue when coming back online
  useEffect(() => {
    const syncQueue = async () => {
      const queue = getOfflineQueue();
      if (queue.length === 0 || !user) return;

      let syncErrors = 0;
      const affectedTripIds = new Set<string>();
      const routeSyncFailures: string[] = [];

      for (const action of queue) {
        try {
          switch (action.type) {
            case "addExpense":
              await supabase
                .from("expenses")
                .insert({ ...action.payload, user_id: user.id });
              break;
            case "addFueling":
              await persistFuelingAdd({
                userId: user.id,
                tripId: action.payload.trip_id,
                fuelingId: action.payload.id,
                fueling: {
                  stationName: action.payload.station,
                  totalValue: action.payload.total_value,
                  liters: action.payload.liters,
                  kmCurrent: action.payload.km_current,
                  date: action.payload.date,
                  fullTank: action.payload.full_tank ?? true,
                  receiptUrl: action.payload.receipt_url || undefined,
                },
              });
              break;
            case "updateFueling":
              await persistFuelingUpdate({
                userId: user.id,
                tripId: action.payload.trip_id,
                fuelingId: action.payload.id,
                fueling: {
                  stationName: action.payload.station,
                  totalValue: action.payload.total_value,
                  liters: action.payload.liters,
                  kmCurrent: action.payload.km_current,
                  date: action.payload.date,
                  fullTank: action.payload.full_tank ?? true,
                  receiptUrl: action.payload.receipt_url || undefined,
                },
              });
              break;
            case "addPersonalExpense":
              await supabase
                .from("personal_expenses")
                .insert({ ...action.payload, user_id: user.id });
              break;
            case "addFreight": {
              const { estimatedDistance, diagnostic } =
                await resolveFreightEstimatedDistance({
                  userId: user.id,
                  origin: action.payload.origin,
                  destination: action.payload.destination,
                });

              await supabase.from("freights").insert({
                ...action.payload,
                user_id: user.id,
                estimated_distance: estimatedDistance,
                advance_amount: action.payload.advance_amount ?? 0,
                payer_name: action.payload.payer_name ?? null,
                delivery_proof_status: action.payload.delivery_proof_status ?? "not_required",
                balance_release_mode: action.payload.balance_release_mode ?? "none",
                balance_adjustments: action.payload.balance_adjustments ?? [],
              });

              affectedTripIds.add(action.payload.trip_id);

              if (diagnostic.distanceKm === null) {
                const details = buildRouteFailureDetails({
                  reason: diagnostic.reason,
                  originQueryUsed: diagnostic.originQueryUsed,
                  destinationQueryUsed: diagnostic.destinationQueryUsed,
                });
                routeSyncFailures.push(details);
                console.error(
                  "Falha ao resolver rota durante sync offline de frete",
                  {
                    tripId: action.payload.trip_id,
                    origin: action.payload.origin,
                    destination: action.payload.destination,
                    reason: diagnostic.reason,
                    originQueryUsed: diagnostic.originQueryUsed,
                    destinationQueryUsed: diagnostic.destinationQueryUsed,
                  },
                );
              }
              break;
            }
            case "deleteFreight": {
              const { data: freightBeforeDelete } = await supabase
                .from("freights")
                .select("trip_id")
                .eq("id", action.payload.id)
                .maybeSingle();

              await supabase
                .from("freights")
                .delete()
                .eq("id", action.payload.id);

              if (freightBeforeDelete?.trip_id) {
                affectedTripIds.add(freightBeforeDelete.trip_id);
              }
              break;
            }
            case "startFreight":
              await supabase
                .from("freights")
                .update({ status: "in_progress" })
                .eq("id", action.payload.freightId);
              break;
            case "completeFreight": {
              await supabase
                .from("freights")
                .update({ status: "completed" })
                .eq("id", action.payload.freightId);

              if (action.payload.option === "start_next_if_planned") {
                const { data: nextPlanned } = await supabase
                  .from("freights")
                  .select("id")
                  .eq("trip_id", action.payload.tripId)
                  .eq("status", "planned")
                  .order("created_at", { ascending: true })
                  .limit(1)
                  .maybeSingle();

                if (nextPlanned?.id) {
                  await supabase
                    .from("freights")
                    .update({ status: "in_progress" })
                    .eq("id", nextPlanned.id);
                }
              }
              break;
            }
            case "updateFreight": {
              const { data: currentFreight } = await supabase
                .from("freights")
                .select("origin, destination, estimated_distance, trip_id")
                .eq("id", action.payload.freightId)
                .maybeSingle();

              if (!currentFreight) break;

              const routeChanged =
                currentFreight.origin !== action.payload.origin ||
                currentFreight.destination !== action.payload.destination;
              const shouldRefreshRoute =
                routeChanged || action.payload.forceRouteRefresh;
              let nextEstimatedDistance = currentFreight.estimated_distance || 0;

              if (shouldRefreshRoute) {
                const { refreshFreightEstimatedDistance } = await import(
                  "@/context/mutations/helpers"
                );
                const { estimatedDistance, diagnostic: distanceDiagnostic } =
                  await refreshFreightEstimatedDistance({
                    origin: action.payload.origin,
                    destination: action.payload.destination,
                    userId: user.id,
                  });

                if (distanceDiagnostic.distanceKm === null) {
                  const details = buildRouteFailureDetails({
                    reason: distanceDiagnostic.reason,
                    originQueryUsed: distanceDiagnostic.originQueryUsed,
                    destinationQueryUsed: distanceDiagnostic.destinationQueryUsed,
                  });
                  routeSyncFailures.push(details);
                  console.error(
                    "Falha ao resolver rota durante sync offline de updateFreight",
                    {
                      tripId: action.payload.tripId,
                      freightId: action.payload.freightId,
                      origin: action.payload.origin,
                      destination: action.payload.destination,
                      reason: distanceDiagnostic.reason,
                      originQueryUsed: distanceDiagnostic.originQueryUsed,
                      destinationQueryUsed: distanceDiagnostic.destinationQueryUsed,
                    },
                  );
                }

                nextEstimatedDistance = estimatedDistance;
              }

              await supabase
                .from("freights")
                .update({
                  origin: action.payload.origin,
                  destination: action.payload.destination,
                  km_initial: action.payload.km_initial,
                  gross_value: action.payload.gross_value,
                  commission_percent: action.payload.commission_percent,
                  commission_value: action.payload.commission_value,
                  estimated_distance: nextEstimatedDistance,
                  payment_due_date: action.payload.payment_due_date ?? null,
                  amount_received: action.payload.amount_received ?? 0,
                  advance_amount: action.payload.advance_amount ?? 0,
                  payer_name: action.payload.payer_name ?? null,
                  delivery_proof_status: action.payload.delivery_proof_status ?? "not_required",
                  balance_release_mode: action.payload.balance_release_mode ?? "none",
                  balance_adjustments: action.payload.balance_adjustments ?? [],
                })
                .eq("id", action.payload.freightId);

              affectedTripIds.add(currentFreight.trip_id);
              break;
            }
            case "deleteFueling":
              await persistFuelingDelete({
                userId: user.id,
                tripId: action.payload.trip_id,
                fuelingId: action.payload.id,
              });
              break;
            case "updateExpense":
              await supabase
                .from("expenses")
                .update({
                  category: action.payload.category,
                  description: action.payload.description,
                  value: action.payload.value,
                  date: action.payload.date,
                  receipt_url: action.payload.receipt_url,
                })
                .eq("id", action.payload.id);
              break;
            case "deleteExpense":
              await supabase
                .from("expenses")
                .delete()
                .eq("id", action.payload.id);
              break;
            case "updatePersonalExpense":
              await supabase
                .from("personal_expenses")
                .update({
                  category: action.payload.category,
                  description: action.payload.description,
                  value: action.payload.value,
                  date: action.payload.date,
                })
                .eq("id", action.payload.id);
              break;
            case "deletePersonalExpense":
              await supabase
                .from("personal_expenses")
                .delete()
                .eq("id", action.payload.id);
              break;
            case "finishTrip":
              if (action.payload.activeFreightId) {
                await supabase
                  .from("freights")
                  .update({ status: "completed" })
                  .eq("id", action.payload.activeFreightId);
              }
              await supabase
                .from("trips")
                .update({
                  status: "finished",
                  finished_at: new Date().toISOString(),
                  estimated_distance: action.payload.finalTripDistance,
                })
                .eq("id", action.payload.tripId);
              if (action.payload.arrivalKm) {
                await supabase
                  .from("vehicles")
                  .update({ current_km: action.payload.arrivalKm })
                  .eq("id", action.payload.vehicleId);
              }
              break;
          }
          removeFromQueue(action.id);
        } catch (err) {
          console.error("Failed to sync action:", action, err);
          syncErrors++;
        }
      }

      if (affectedTripIds.size > 0) {
        const tripIds = Array.from(affectedTripIds);
        const { data: tripsForKm } = await supabase
          .from("trips")
          .select("id, vehicle_id")
          .in("id", tripIds);

        const affectedVehicleIds = new Set(
          (tripsForKm || []).map((trip) => trip.vehicle_id),
        );

        for (const tripId of tripIds) {
          try {
            await updateTripEstimatedDistanceBySum(tripId);
          } catch (error) {
            console.error(
              "Falha ao atualizar distância estimada após sync offline",
              { tripId, error },
            );
            syncErrors++;
          }
        }

        for (const vehicleId of affectedVehicleIds) {
          try {
            await recalculateVehicleKm(vehicleId);
          } catch (error) {
            console.error("Falha ao recalcular odômetro após sync offline", {
              vehicleId,
              error,
            });
            syncErrors++;
          }
        }
      }

      const routeSyncToast = buildOfflineSyncRouteToast(routeSyncFailures);
      if (routeSyncToast) {
        showActionNotice(routeSyncToast.title, routeSyncToast.description);
      }

      if (syncErrors === 0) {
        toast({
          title: "Dados sincronizados",
          description: "Suas ações offline foram enviadas para a nuvem.",
        });
      } else {
        showActionNotice(
          "Sincronização parcial",
          `${syncErrors} ação(ões) ainda dependem de nova tentativa.`,
        );
      }
      await fetchData();
    };

    const handleOnline = () => syncQueue();
    window.addEventListener("online", handleOnline);
    if (isOnline()) syncQueue();
    return () => window.removeEventListener("online", handleOnline);
  }, [user, fetchData]);

  const setPersonalExpensesEnabled = useCallback(
    async (val: boolean) => {
      if (!user) throw new Error("Usuário não autenticado. Faça login novamente.");
      setPersonalExpensesEnabledState(val);
      await supabase
        .from("profiles")
        .update({ personal_expenses_enabled: val })
        .eq("user_id", user.id);
    },
    [user],
  );

  // Domain mutation hooks
  const { addVehicle, updateVehicle, deleteVehicle, updateVehicleKm } =
    useVehicleMutations({ user, data, fetchData });

  const { addTrip, finishTrip, deleteTrip, getActiveTrips } =
    useTripMutations({ user, data, fetchData, updateVehicleKm });

  const { addFreight, updateFreight, deleteFreight, startFreight, completeFreight } =
    useFreightMutations({ user, data, fetchData });

  const { addFueling, updateFueling, deleteFueling } =
    useFuelingMutations({ user, data, fetchData });

  const {
    addExpense,
    updateExpense,
    deleteExpense,
    addPersonalExpense,
    updatePersonalExpense,
    deletePersonalExpense,
    clearHistory,
  } = useExpenseMutations({ user, data, fetchData });

  const { addMaintenanceService, deleteMaintenanceService } =
    useMaintenanceMutations({ user, fetchData });

  return (
    <AppContext.Provider
      value={{
        data,
        loading,
        personalExpensesEnabled,
        setPersonalExpensesEnabled,
        addVehicle,
        updateVehicle,
        deleteVehicle,
        updateVehicleKm,
        addTrip,
        finishTrip,
        deleteTrip,
        getActiveTrips,
        addFreight,
        updateFreight,
        deleteFreight,
        startFreight,
        completeFreight,
        addFueling,
        updateFueling,
        deleteFueling,
        addExpense,
        updateExpense,
        deleteExpense,
        addPersonalExpense,
        updatePersonalExpense,
        deletePersonalExpense,
        clearHistory,
        refreshData: fetchData,
        addMaintenanceService,
        deleteMaintenanceService,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
