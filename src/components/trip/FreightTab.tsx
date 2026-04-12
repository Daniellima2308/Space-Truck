import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Trip, Freight, Vehicle, FREIGHT_STATUS_LABELS } from "@/types";
import { formatCurrency, formatDate, formatNumber } from "@/lib/calculations";
import { sortFreightsByOperationalPriority } from "@/lib/freightStatus";
import {
  getFreightReceivedPercentage,
  getFreightRemainingBalance,
  getFreightAdvanceReceived,
  getFreightTotalReceived,
  isFreightSettled,
  getFreightPaymentForecastState,
  type FreightPaymentForecastState,
} from "@/lib/freightReceivables";
import { CityAutocomplete } from "@/components/CityAutocomplete";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  canEditCommissionPercentForFreight,
  getDefaultCommissionPercentForVehicle,
  profileUsesFixedCommission,
  shouldShowCommissionFieldByDefault,
  shouldShowCommissionToggle,
} from "@/lib/vehicleOperation";
import { DeleteConfirmDialog } from "@/components/trip/DeleteConfirmDialog";
import { FreightUpdateResult, StartFreightResult } from "@/context/app-context";
import type { FreightEditableInput } from "@/context/mutations/useFreightMutations";
import { FontAwesomeIcon, iconCheckCircle2, iconLoader2, iconMapPin, iconPlayCircle, iconPlus, iconTrash2, iconRuler, iconWallet, iconPencil } from "@/lib/icons";

interface FreightTabProps {
  trip: Trip;
  vehicle?: Vehicle;
  isOpen: boolean;
  showForm: boolean;
  setShowForm: (v: boolean) => void;
  addFreight: (
    tripId: string,
    f: FreightEditableInput,
  ) => Promise<{ freightId?: string }>;
  updateFreight: (
    tripId: string,
    freightId: string,
    f: FreightEditableInput,
    options?: { forceRouteRefresh?: boolean; suppressSuccessToast?: boolean },
  ) => Promise<FreightUpdateResult>;
  deleteFreight: (tripId: string, freightId: string) => Promise<void>;
  startFreight: (tripId: string, freightId: string) => Promise<StartFreightResult>;
  completeFreight: (
    tripId: string,
    freightId: string,
    option?: "complete_only" | "start_next_if_planned",
  ) => Promise<{ promotedFreightId?: string | null }>;
  onRequestOpenFreightForm?: () => void;
}

export function FreightTab({
  trip,
  vehicle,
  isOpen,
  showForm,
  setShowForm,
  addFreight,
  updateFreight,
  deleteFreight,
  startFreight,
  completeFreight,
  onRequestOpenFreightForm,
}: FreightTabProps) {
  type AdvanceInputMode = "currency" | "percentage";
  type SimplifiedProofRequirement = "none" | "photo" | "physical";
  const [origin, setOrigin] = useState("");
  const [dest, setDest] = useState("");
  const [km, setKm] = useState("");
  const [gross, setGross] = useState("");
  const [isModeChooserOpen, setIsModeChooserOpen] = useState(false);
  const [postCreateFreightId, setPostCreateFreightId] = useState<string | null>(null);
  const [postCreateModeFreight, setPostCreateModeFreight] = useState<Freight | null>(null);
  const [isSavingMode, setIsSavingMode] = useState(false);
  const [useCommission, setUseCommission] = useState(false);
  const [comm, setComm] = useState("");
  const [finishingFreight, setFinishingFreight] = useState<Freight | null>(
    null,
  );
  const [editingKmFreight, setEditingKmFreight] = useState<Freight | null>(
    null,
  );
  const [routeReviewFreight, setRouteReviewFreight] = useState<Freight | null>(
    null,
  );
  const [editOrigin, setEditOrigin] = useState("");
  const [editDestination, setEditDestination] = useState("");
  const [editKmInitial, setEditKmInitial] = useState("");
  const [editingReceivableFreight, setEditingReceivableFreight] = useState<Freight | null>(null);
  const [editPaymentDueDate, setEditPaymentDueDate] = useState("");
  const [editAmountReceived, setEditAmountReceived] = useState("");
  const [editAdvanceAmount, setEditAdvanceAmount] = useState("");
  const [editAdvanceInputMode, setEditAdvanceInputMode] = useState<AdvanceInputMode>("currency");
  const [editAdvancePercent, setEditAdvancePercent] = useState("");
  const [editAdvanceCurrencyInput, setEditAdvanceCurrencyInput] = useState("");
  const [editPayerName, setEditPayerName] = useState("");
  const [editProofRequirement, setEditProofRequirement] = useState<SimplifiedProofRequirement>("none");
  const [quickAdjustmentType, setQuickAdjustmentType] = useState<"discount" | "increase">("discount");
  const [quickAdjustmentAmount, setQuickAdjustmentAmount] = useState("");
  const [quickAdjustmentNote, setQuickAdjustmentNote] = useState("");
  const [showAdjustmentEditor, setShowAdjustmentEditor] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinishingFreight, setIsFinishingFreight] = useState(false);
  const [isSavingKm, setIsSavingKm] = useState(false);
  const [isSavingRouteReview, setIsSavingRouteReview] = useState(false);
  const [isSavingReceivable, setIsSavingReceivable] = useState(false);
  const [postCompletionForecastFreight, setPostCompletionForecastFreight] = useState<Freight | null>(null);
  const [completionForecastDate, setCompletionForecastDate] = useState("");
  const [isSavingCompletionForecast, setIsSavingCompletionForecast] = useState(false);
  const [pendingStartId, setPendingStartId] = useState<string | null>(null);
  const [startBlockedFreight, setStartBlockedFreight] = useState<Freight | null>(null);
  const [isHandingOffFreight, setIsHandingOffFreight] = useState(false);
  const [freightToDelete, setFreightToDelete] = useState<Freight | null>(null);
  const [isDeletingFreight, setIsDeletingFreight] = useState(false);
  const { toast } = useToast();

  const defaultCommission = useMemo(
    () => getDefaultCommissionPercentForVehicle(vehicle),
    [vehicle],
  );
  const usesFixedCommission = vehicle
    ? profileUsesFixedCommission(vehicle.operationProfile)
    : false;
  const isDriverOwnerProfile = vehicle?.operationProfile === "driver_owner";
  const showToggle = vehicle
    ? isDriverOwnerProfile ||
      shouldShowCommissionToggle(vehicle.operationProfile)
    : true;
  const showCommissionInput = vehicle
    ? usesFixedCommission || (showToggle && useCommission)
    : useCommission;

  const parseCurrencyInput = (rawValue: string): number => {
    const normalized = rawValue
      .replace(/[R$\s]/g, "")
      .replace(/\./g, "")
      .replace(",", ".")
      .replace(/[^0-9.-]/g, "");
    const parsed = Number(normalized);
    if (!Number.isFinite(parsed)) return 0;
    return Math.max(0, parsed);
  };

  const formatCurrencyInput = (value: number): string =>
    value.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  useEffect(() => {
    if (!showForm) return;

    if (
      vehicle &&
      shouldShowCommissionFieldByDefault(vehicle.operationProfile)
    ) {
      setUseCommission(true);
      setComm(defaultCommission.toString());
      return;
    }

    setUseCommission(false);
    setComm("");
  }, [showForm, vehicle, defaultCommission]);

  useEffect(() => {
    if (!postCreateFreightId || postCreateModeFreight) return;
    const found = trip.freights.find((freight) => freight.id === postCreateFreightId);
    if (found) setPostCreateModeFreight(found);
  }, [postCreateFreightId, postCreateModeFreight, trip.freights]);

  const statusClassByFreight: Record<Freight["status"], string> = {
    planned: "bg-secondary text-muted-foreground border-border",
    in_progress: "bg-warning/15 text-warning border-warning/30",
    completed: "bg-profit/15 text-profit border-profit/30",
  };
  const forecastStatusLabel: Record<FreightPaymentForecastState, string> = {
    no_forecast: "Sem previsão",
    on_track: "No prazo",
    approaching: "Chegando amanhã",
    due_today: "Vence hoje",
    overdue: "Atrasado",
    settled: "Quitado",
  };
  const forecastStatusClass: Record<FreightPaymentForecastState, string> = {
    no_forecast: "border-border bg-secondary/60 text-muted-foreground",
    on_track: "border-info/30 bg-info/10 text-info",
    approaching: "border-warning/30 bg-warning/10 text-warning",
    due_today: "border-warning/30 bg-warning/15 text-warning",
    overdue: "border-expense/30 bg-expense/10 text-expense",
    settled: "border-profit/30 bg-profit/10 text-profit",
  };
  const balanceReleaseModeLabel: Record<NonNullable<Freight["balanceReleaseMode"]>, string> = {
    none: "Não precisa de canhoto",
    proof_photo: "Precisa enviar foto do canhoto",
    physical_proof: "Precisa enviar canhoto físico",
    agreed_deadline: "Não precisa de canhoto",
    direct_delivery: "Não precisa de canhoto",
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!origin || !dest || !km || !gross || isSubmitting) return;
    if (showCommissionInput && !comm) return;

    const commissionPercent = showCommissionInput ? Number.parseFloat(comm) : 0;
    try {
      setIsSubmitting(true);
      const createdFreight = await addFreight(trip.id, {
        origin,
        destination: dest,
        kmInitial: Number.parseFloat(km),
        grossValue: Number.parseFloat(gross),
        paymentDueDate: undefined,
        amountReceived: 0,
        receivableMode: "off",
        commissionPercent,
      });
      setPostCreateFreightId(createdFreight?.freightId ?? null);
      setIsModeChooserOpen(true);
      setOrigin("");
      setDest("");
      setKm("");
      setGross("");
      setUseCommission(false);
      setComm("");
      setShowForm(false);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível salvar este frete agora.";
      toast({
        title: "Não foi possível salvar agora",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectReceivableMode = async (mode: "off" | "basic" | "complete") => {
    if (isSavingMode) return;
    if (mode === "off") {
      setIsModeChooserOpen(false);
      setPostCreateFreightId(null);
      setPostCreateModeFreight(null);
      return;
    }
    if (!postCreateModeFreight) {
      toast({
        title: "Aguarde só um instante",
        description: "Estamos carregando o frete salvo para aplicar o modo escolhido.",
        variant: "notice",
      });
      return;
    }
    try {
      setIsSavingMode(true);
      await updateFreight(trip.id, postCreateModeFreight.id, {
        origin: postCreateModeFreight.origin,
        destination: postCreateModeFreight.destination,
        kmInitial: postCreateModeFreight.kmInitial,
        grossValue: postCreateModeFreight.grossValue,
        paymentDueDate: postCreateModeFreight.paymentDueDate,
        amountReceived: postCreateModeFreight.amountReceived,
        advanceAmount: postCreateModeFreight.advanceAmount,
        payerName: postCreateModeFreight.payerName,
        deliveryProofStatus: postCreateModeFreight.deliveryProofStatus,
        balanceReleaseMode: postCreateModeFreight.balanceReleaseMode,
        balanceAdjustments: postCreateModeFreight.balanceAdjustments,
        receivableMode: mode,
        commissionPercent: postCreateModeFreight.commissionPercent,
      });
      setIsModeChooserOpen(false);
      setPostCreateModeFreight(null);
      setPostCreateFreightId(null);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível ativar o recebimento agora.";
      toast({
        title: "Não foi possível ativar agora",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSavingMode(false);
    }
  };

  const handleStartFreight = async (freightId: string) => {
    if (pendingStartId) return;
    try {
      setPendingStartId(freightId);
      const result = await startFreight(trip.id, freightId);
      if (result.status === "blocked_active_freight") {
        const nextFreight =
          trip.freights.find((freight) => freight.id === freightId) ?? null;
        setStartBlockedFreight(nextFreight);
      }
    } finally {
      setPendingStartId(null);
    }
  };

  const handleConfirmFreightHandOff = async () => {
    if (!startBlockedFreight || !activeFreight || isHandingOffFreight) return;

    try {
      setIsHandingOffFreight(true);
      await completeFreight(trip.id, activeFreight.id, "complete_only");
      const startResult = await startFreight(trip.id, startBlockedFreight.id);

      if (startResult.status === "started") {
        toast({
          title: "Frete atual concluído",
          description: "Novo trecho iniciado com clareza na sequência.",
        });
      }
      setStartBlockedFreight(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Tenta novamente.";
      toast({
        title: "Não deu para trocar o trecho agora",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsHandingOffFreight(false);
    }
  };

  const handleCompleteWithOption = async (
    option: "complete_only" | "start_next_if_planned",
  ) => {
    if (!finishingFreight || isFinishingFreight) return;
    try {
      setIsFinishingFreight(true);
      const { promotedFreightId } = await completeFreight(
        trip.id,
        finishingFreight.id,
        option,
      );
      const hadPlannedFreight = trip.freights.some(
        (f) => f.status === "planned" && f.id !== finishingFreight.id,
      );

      if (option === "start_next_if_planned") {
        if (promotedFreightId) {
          toast({
            title: "Frete concluído",
            description: "Próximo frete iniciado.",
          });
        } else {
          onRequestOpenFreightForm?.();
          toast({
            title: "Frete concluído",
            description: "Agora você pode lançar o próximo frete.",
          });
        }
      } else if (!hadPlannedFreight) {
        toast({
          title: "Frete concluído",
          description: "Viagem pronta para finalizar quando você quiser.",
        });
      } else {
        toast({
          title: "Frete concluído",
          description: "Próximo trecho ficou aguardando início.",
          variant: "notice",
        });
      }

      const latestFreight = getLatestFreight(finishingFreight.id) ?? finishingFreight;
      const isReceivableActive = (latestFreight.receivableMode ?? "off") !== "off";
      const hasPendingBalance = !isFreightSettled(latestFreight);
      if (isReceivableActive && hasPendingBalance && !latestFreight.paymentDueDate) {
        setCompletionForecastDate("");
        setPostCompletionForecastFreight(latestFreight);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Tenta novamente.";
      toast({
        title: "Não deu para concluir o frete",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsFinishingFreight(false);
      setFinishingFreight(null);
    }
  };

  const handleSaveCompletionForecast = async () => {
    if (!postCompletionForecastFreight || isSavingCompletionForecast) return;
    if (!completionForecastDate) return;
    const latestFreight = getLatestFreight(postCompletionForecastFreight.id) ?? postCompletionForecastFreight;
    try {
      setIsSavingCompletionForecast(true);
      await updateFreight(trip.id, latestFreight.id, {
        origin: latestFreight.origin,
        destination: latestFreight.destination,
        kmInitial: latestFreight.kmInitial,
        grossValue: latestFreight.grossValue,
        paymentDueDate: completionForecastDate,
        amountReceived: latestFreight.amountReceived,
        advanceAmount: latestFreight.advanceAmount,
        payerName: latestFreight.payerName,
        deliveryProofStatus: latestFreight.deliveryProofStatus,
        balanceReleaseMode: latestFreight.balanceReleaseMode,
        balanceAdjustments: latestFreight.balanceAdjustments,
        receivableMode: latestFreight.receivableMode,
        commissionPercent: latestFreight.commissionPercent,
      });
      setPostCompletionForecastFreight(null);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível salvar a previsão agora.";
      toast({
        title: "Não foi possível salvar agora",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSavingCompletionForecast(false);
    }
  };

  const openEditKmDialog = (freight: Freight) => {
    setEditingKmFreight(freight);
    setEditKmInitial(String(freight.kmInitial));
  };

  const openRouteReviewDialog = (freight: Freight) => {
    setRouteReviewFreight(freight);
    setEditOrigin(freight.origin);
    setEditDestination(freight.destination);
  };

  const getLatestFreight = (freightId: string): Freight | null => {
    return trip.freights.find((freight) => freight.id === freightId) ?? null;
  };

  const handleSaveKmEdit = async () => {
    if (!editingKmFreight || isSavingKm) return;
    const latestFreight = getLatestFreight(editingKmFreight.id) ?? editingKmFreight;

    const parsedKm = Number(editKmInitial);
    if (!Number.isFinite(parsedKm)) return;

    try {
      setIsSavingKm(true);
      await updateFreight(trip.id, latestFreight.id, {
        origin: latestFreight.origin,
        destination: latestFreight.destination,
        kmInitial: parsedKm,
        grossValue: latestFreight.grossValue,
        paymentDueDate: latestFreight.paymentDueDate,
        amountReceived: latestFreight.amountReceived,
        commissionPercent: latestFreight.commissionPercent,
      });

      setEditingKmFreight(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Tenta novamente.";
      toast({
        title: "Não foi possível salvar agora",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSavingKm(false);
    }
  };

  const handleSaveRouteReview = async () => {
    if (!routeReviewFreight || isSavingRouteReview) return;
    if (!editOrigin.trim() || !editDestination.trim()) return;
    const latestFreight = getLatestFreight(routeReviewFreight.id) ?? routeReviewFreight;

    try {
      setIsSavingRouteReview(true);
      const result = await updateFreight(
        trip.id,
        latestFreight.id,
        {
          origin: editOrigin.trim(),
          destination: editDestination.trim(),
          kmInitial: latestFreight.kmInitial,
          grossValue: latestFreight.grossValue,
          paymentDueDate: latestFreight.paymentDueDate,
          amountReceived: latestFreight.amountReceived,
          commissionPercent: latestFreight.commissionPercent,
        },
        { forceRouteRefresh: true, suppressSuccessToast: true },
      );

      if (result.status === "route_refreshed") {
        toast({
          title: "Previsão liberada",
          description:
            "Origem e destino foram revisados e a rota deste trecho já voltou a mostrar previsão.",
        });
        setRouteReviewFreight(null);
        return;
      }

      if (result.status === "saved_without_route") {
        toast({
          title: "Previsão ainda em ajuste",
          description:
            result.userMessage ||
            "Rota salva, mas a previsão ainda não foi liberada.",
          variant: "notice",
        });
        setRouteReviewFreight(null);
        return;
      }

      toast({
        title: "Não foi possível revisar a rota agora",
        description:
          result.userMessage ||
          "Revise origem e destino para tentar novamente.",
        variant: "destructive",
      });
    } catch (error) {
      console.error("Falha inesperada ao revisar rota do frete", error);
      toast({
        title: "Não foi possível revisar a rota agora",
        description:
          "Não deu para liberar a previsão da rota agora. Você pode seguir lançando a viagem normalmente e tentar novamente depois.",
        variant: "destructive",
      });
    } finally {
      setIsSavingRouteReview(false);
    }
  };

  const openReceivableDialog = (freight: Freight) => {
    const advanceAmount = freight.advanceAmount ?? 0;
    setEditingReceivableFreight(freight);
    setEditPaymentDueDate(freight.paymentDueDate ?? "");
    setEditAmountReceived(String(freight.amountReceived ?? 0));
    setEditAdvanceAmount(String(advanceAmount));
    setEditAdvanceCurrencyInput(formatCurrencyInput(advanceAmount));
    setEditAdvanceInputMode("currency");
    setEditAdvancePercent("");
    setEditPayerName(freight.payerName ?? "");
    setEditProofRequirement(
      freight.balanceReleaseMode === "proof_photo"
        ? "photo"
        : freight.balanceReleaseMode === "physical_proof"
          ? "physical"
          : "none",
    );
    setQuickAdjustmentType("discount");
    setQuickAdjustmentAmount("");
    setQuickAdjustmentNote("");
    setShowAdjustmentEditor(false);
  };

  const handleSaveReceivable = async () => {
    if (!editingReceivableFreight || isSavingReceivable) return;
    const latestFreight =
      getLatestFreight(editingReceivableFreight.id) ?? editingReceivableFreight;
    const parsedAmountReceived = Number(editAmountReceived || 0);
    const parsedAdvanceAmount = Number(editAdvanceAmount || 0);
    const parsedQuickAdjustmentAmount = Number(quickAdjustmentAmount || 0);
    if (!Number.isFinite(parsedAmountReceived) || parsedAmountReceived < 0) {
      toast({
        title: "Valor recebido inválido",
        description: "Informe um valor recebido maior ou igual a zero.",
        variant: "destructive",
      });
      return;
    }
    if (!Number.isFinite(parsedAdvanceAmount) || parsedAdvanceAmount < 0) {
      toast({
        title: "Adiantamento inválido",
        description: "Informe um adiantamento maior ou igual a zero.",
        variant: "destructive",
      });
      return;
    }
    if (
      quickAdjustmentAmount.trim() &&
      (!Number.isFinite(parsedQuickAdjustmentAmount) ||
        parsedQuickAdjustmentAmount <= 0)
    ) {
      toast({
        title: "Ajuste no saldo inválido",
        description: "Use um valor maior que zero para desconto ou acréscimo.",
        variant: "destructive",
      });
      return;
    }

    const nextAdjustments = Array.isArray(latestFreight.balanceAdjustments)
      ? [...latestFreight.balanceAdjustments]
      : [];
    if (quickAdjustmentAmount.trim() && parsedQuickAdjustmentAmount > 0) {
      nextAdjustments.push({
        type: quickAdjustmentType,
        amount: parsedQuickAdjustmentAmount,
        note: quickAdjustmentNote.trim() || undefined,
      });
    }

    try {
      setIsSavingReceivable(true);
      const nextPaymentDueDate =
        latestFreight.status === "completed"
          ? editPaymentDueDate || undefined
          : latestFreight.paymentDueDate;
      const result = await updateFreight(trip.id, latestFreight.id, {
        origin: latestFreight.origin,
        destination: latestFreight.destination,
        kmInitial: latestFreight.kmInitial,
        grossValue: latestFreight.grossValue,
        paymentDueDate: nextPaymentDueDate,
        amountReceived: parsedAmountReceived,
        advanceAmount: parsedAdvanceAmount,
        payerName: editPayerName.trim() || undefined,
        deliveryProofStatus:
          editProofRequirement === "none" ? "not_required" : "pending_send",
        balanceReleaseMode:
          editProofRequirement === "photo"
            ? "proof_photo"
            : editProofRequirement === "physical"
              ? "physical_proof"
              : "none",
        balanceAdjustments: nextAdjustments,
        commissionPercent: latestFreight.commissionPercent,
      });

      if (result.status === "blocked") {
        return;
      }

      setEditingReceivableFreight(null);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível salvar o recebimento agora.";
      toast({
        title: "Não foi possível salvar agora",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSavingReceivable(false);
    }
  };

  const hasPlannedFreight = trip.freights.some(
    (freight) => freight.status === "planned",
  );
  const hasInProgressFreight = trip.freights.some(
    (freight) => freight.status === "in_progress",
  );

  const sortedFreights = useMemo(
    () => sortFreightsByOperationalPriority(trip.freights),
    [trip.freights],
  );

  const activeFreight = useMemo(
    () => trip.freights.find((freight) => freight.status === "in_progress") ?? null,
    [trip.freights],
  );

  const deleteDialogCopy = useMemo(() => {
    if (!freightToDelete) {
      return {
        title: "Excluir frete?",
        description: "Essa ação remove este frete da viagem.",
        warning:
          "Depois de excluir, esse lançamento sai da viagem e não dá para recuperar por aqui.",
      };
    }

    if (freightToDelete.status === "planned") {
      return {
        title: "Excluir próximo frete?",
        description:
          "Esse trecho vai sair da fila da viagem e não será usado como próximo frete.",
        warning:
          "Esse trecho ainda não rodou. O odômetro atual do veículo continua baseado só no que já foi operado.",
      };
    }

    if (freightToDelete.status === "in_progress") {
      return {
        title: "Excluir frete em andamento?",
        description:
          "Esse trecho vai sair da viagem e a viagem ficará sem frete rodando até você iniciar outro trecho.",
        warning:
          "O progresso e o KM atual do veículo serão recalculados com base apenas nos lançamentos que sobrarem.",
      };
    }

    return {
      title: "Excluir frete concluído?",
      description:
        "Esse trecho concluído vai sair do histórico operacional da viagem.",
      warning:
        "O KM do veículo será recalculado só com base nos registros operacionais restantes, incluindo abastecimentos se houver.",
    };
  }, [freightToDelete]);

  const freightStatusCopy: Record<Freight["status"], string> = {
    planned: "Trecho salvo e aguardando início.",
    in_progress: "Trecho rodando neste momento.",
    completed: "Trecho já concluído nesta viagem.",
  };

  const handleDeleteFreight = async () => {
    if (!freightToDelete || isDeletingFreight) return;

    try {
      setIsDeletingFreight(true);
      await deleteFreight(trip.id, freightToDelete.id);
      setFreightToDelete(null);
    } finally {
      setIsDeletingFreight(false);
    }
  };

  return (
    <>
      <div className="space-y-2">
        {trip.freights.length === 0 && (
          <div className="gradient-card rounded-xl border border-dashed border-border/70 p-4">
            <p className="text-sm font-semibold text-foreground">
              Ainda não há frete nesta viagem.
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Cadastre o primeiro trecho para liberar leitura de bruto, comissão, KM e progresso da viagem.
            </p>
          </div>
        )}

        {trip.freights.length > 0 && !hasInProgressFreight && (
          <div className="rounded-xl border border-border/70 bg-secondary/35 p-3">
            <p className="text-xs font-semibold text-foreground">
              {hasPlannedFreight
                ? "Tem frete aguardando início."
                : "Nenhum frete está rodando agora."}
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              {hasPlannedFreight
                ? "Toque em Iniciar no próximo trecho para voltar a acompanhar progresso e previsão da viagem."
                : "Se os trechos já acabaram, revise os lançamentos e finalize a viagem quando fizer sentido."}
            </p>
          </div>
        )}

        {sortedFreights.map((f: Freight) => {
          const receivableMode = f.receivableMode ?? "off";
          const receivableEnabled = receivableMode !== "off";
          const remainingBalance = getFreightRemainingBalance(f);
          const receivedPercentage = getFreightReceivedPercentage(f);
          const advanceAmount = getFreightAdvanceReceived(f);
          const totalReceived = getFreightTotalReceived(f);
          const freightIsSettled = isFreightSettled(f);
          const forecastState = getFreightPaymentForecastState(f);
          const hasAdjustments = Array.isArray(f.balanceAdjustments) && f.balanceAdjustments.length > 0;

          return (
          <div key={f.id} className="gradient-card rounded-xl p-3 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm font-semibold leading-tight flex items-center gap-1.5">
                <FontAwesomeIcon icon={iconMapPin} className="w-3.5 h-3.5 text-muted-foreground" />
                <span>
                  {f.origin} → {f.destination}
                </span>
              </p>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusClassByFreight[f.status]}`}
                >
                  {FREIGHT_STATUS_LABELS[f.status]}
                </span>
                <p className="text-xs text-muted-foreground">
                  {freightStatusCopy[f.status]}
                </p>
              </div>
            </div>
            {isOpen && (
              <button
                onClick={() => setFreightToDelete(f)}
                className="p-1"
                aria-label="Excluir frete"
              >
                <FontAwesomeIcon icon={iconTrash2} className="w-3.5 h-3.5 text-expense" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="rounded-md bg-secondary/60 p-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                Bruto
              </p>
              <p className="text-sm font-mono font-bold text-profit">
                {formatCurrency(f.grossValue)}
              </p>
            </div>
            <div className="rounded-md bg-secondary/60 p-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <FontAwesomeIcon icon={iconWallet} className="w-3 h-3" />
                {isDriverOwnerProfile ? "Retirada" : "Comissão"}
              </p>
              <p className="text-sm font-mono font-bold">
                {formatCurrency(f.commissionValue)}
              </p>
            </div>
            <div className="rounded-md bg-secondary/60 p-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <FontAwesomeIcon icon={iconRuler} className="w-3 h-3" />
                KM inicial
              </p>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-mono font-bold">
                  {formatNumber(f.kmInitial)} km
                </p>
                {isOpen && f.status !== "completed" && (
                  <button
                    onClick={() => openEditKmDialog(f)}
                    className="p-1 text-muted-foreground hover:text-foreground"
                    aria-label="Editar KM inicial"
                  >
                    <FontAwesomeIcon icon={iconPencil} className="w-3.5 h-3.5" />
                  </button>
                )}
                {isOpen && f.status === "completed" && (
                  <span className="text-[10px] font-medium text-muted-foreground">
                    Histórico travado
                  </span>
                )}
              </div>
            </div>
            <div className="rounded-md bg-secondary/60 p-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Recebido</p>
              <p className="text-sm font-mono font-bold">{formatCurrency(f.amountReceived)}</p>
              <p className="text-[10px] text-muted-foreground">{receivedPercentage.toFixed(0)}%</p>
            </div>
          </div>

          {receivableEnabled && (
          <div className="rounded-md border border-border/70 bg-background/70 p-3 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Recebimento</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <p className="text-muted-foreground">Recebido: <span className="font-mono text-foreground">{formatCurrency(totalReceived)}</span></p>
              <p className="text-muted-foreground">Saldo: <span className="font-mono text-foreground">{formatCurrency(remainingBalance)}</span></p>
            </div>
            {f.payerName && <p className="text-xs text-muted-foreground">Quem paga: {f.payerName}</p>}
            {(f.advanceAmount ?? 0) > 0 && (
              <p className="text-xs text-muted-foreground">
                Adiantamento: <span className="font-mono text-foreground">{formatCurrency(advanceAmount)}</span>
              </p>
            )}
            {f.status === "completed" && (
              <>
                <p className={`inline-flex w-fit rounded-full border px-2 py-0.5 text-[10px] font-semibold ${forecastStatusClass[forecastState]}`}>
                  {forecastStatusLabel[forecastState]}
                </p>
                {f.paymentDueDate ? (
                  <p className="text-xs text-muted-foreground">Previsão de pagamento: {formatDate(f.paymentDueDate)}</p>
                ) : (
                  remainingBalance > 0 && (
                    <p className="text-xs text-warning">Sem previsão de pagamento informada.</p>
                  )
                )}
                {receivableMode === "complete" && (
                  <p className="text-xs text-muted-foreground">
                    {balanceReleaseModeLabel[f.balanceReleaseMode ?? "none"]}
                    {hasAdjustments ? " · Ajuste no saldo aplicado" : ""}
                  </p>
                )}
                <p className="text-xs font-medium text-foreground">
                  Situação: {freightIsSettled ? "Frete quitado" : "Saldo em aberto"}
                </p>
              </>
            )}
          </div>
          )}

          <div className="rounded-md bg-secondary/60 p-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
              KM estimado
            </p>
            <p className="text-sm font-mono font-bold">
              {formatNumber(f.estimatedDistance || 0)} km
            </p>
            {f.estimatedDistance <= 0 && (
              <div className="mt-2 rounded-lg border border-warning/30 bg-warning/10 p-3">
                <p className="text-xs font-semibold text-foreground">
                  Sem previsão de rota no momento
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  Ainda não conseguimos estimar a distância deste trecho. Você pode seguir lançando a viagem normalmente e revisar origem e destino para tentar liberar a previsão.
                </p>
                <button
                  type="button"
                  onClick={() => openRouteReviewDialog(f)}
                  className="mt-2 inline-flex min-h-[44px] items-center rounded-lg border border-border/70 px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-background"
                >
                  Revisar origem e destino
                </button>
              </div>
            )}
          </div>

          {isOpen && (
            <div className="flex flex-wrap gap-2">
              {f.status !== "in_progress" && f.status !== "completed" && (
                <button
                  onClick={() => handleStartFreight(f.id)}
                  disabled={pendingStartId === f.id}
                  className="inline-flex min-h-[44px] items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-semibold hover:bg-secondary disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {pendingStartId === f.id ? (
                    <FontAwesomeIcon icon={iconLoader2} className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <FontAwesomeIcon icon={iconPlayCircle} className="w-3.5 h-3.5" />
                  )}{" "}
                  Iniciar trecho
                </button>
              )}
              {f.status === "in_progress" && (
                <button
                  onClick={() => setFinishingFreight(f)}
                  className="inline-flex min-h-[44px] items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-semibold hover:bg-secondary"
                >
                  <FontAwesomeIcon icon={iconCheckCircle2} className="w-3.5 h-3.5" /> Concluir
                </button>
              )}
              {receivableEnabled && (
                <button
                  onClick={() => openReceivableDialog(f)}
                  className="inline-flex min-h-[44px] items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-semibold hover:bg-secondary"
                >
                  <FontAwesomeIcon icon={iconPencil} className="w-3.5 h-3.5" /> {receivableMode === "basic" ? "Registrar recebimento" : "Abrir painel de recebimento"}
                </button>
              )}
            </div>
          )}
          </div>
          );
        })}
      {isOpen &&
        (showForm ? (
          <form
            onSubmit={handleSubmit}
            className="gradient-card rounded-xl p-4 space-y-3"
          >
            <div className="grid grid-cols-2 gap-3">
              <CityAutocomplete
                placeholder="Origem"
                value={origin}
                onChange={setOrigin}
                className="input-field"
              />
              <CityAutocomplete
                placeholder="Destino"
                value={dest}
                onChange={setDest}
                className="input-field"
              />
              <input
                placeholder="KM Inicial"
                type="number"
                min="0"
                value={km}
                onChange={(e) => setKm(e.target.value)}
                className="input-field"
                disabled={isSubmitting}
              />
              <input
                placeholder="Valor Bruto (R$)"
                type="number"
                step="0.01"
                min="0.01"
                value={gross}
                onChange={(e) => setGross(e.target.value)}
                className="input-field"
                disabled={isSubmitting}
              />
            </div>

            {showToggle && (
              <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <input
                  type="checkbox"
                  checked={useCommission}
                  disabled={isSubmitting}
                  onChange={(e) => {
                    const shouldUse = e.target.checked;
                    setUseCommission(shouldUse);
                    if (!shouldUse) setComm("");
                  }}
                />
                {isDriverOwnerProfile
                  ? "Separar minha retirada neste frete?"
                  : "Usar comissão neste frete?"}
              </label>
            )}

            {usesFixedCommission && (
              <p className="text-xs text-muted-foreground">
                {isDriverOwnerProfile ? "Retirada aplicada" : "Comissão aplicada"}: {defaultCommission}%
              </p>
            )}

            {showCommissionInput && (
              <input
                placeholder={
                  isDriverOwnerProfile ? "Retirada (%)" : "Comissão (%)"
                }
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={comm}
                onChange={(e) => setComm(e.target.value)}
                disabled={
                  isSubmitting || !canEditCommissionPercentForFreight(vehicle)
                }
                className="input-field"
              />
            )}

            {!showToggle && vehicle?.operationProfile === "driver_owner" && (
              <p className="text-xs text-muted-foreground">
                Neste perfil, os fretes entram sem retirada e o foco fica no
                líquido da viagem.
              </p>
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 gradient-profit text-primary-foreground rounded-lg py-2.5 text-sm font-bold min-h-[44px] disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <FontAwesomeIcon icon={iconLoader2} className="w-4 h-4 animate-spin" /> Salvando...
                  </>
                ) : (
                  "Salvar frete"
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                disabled={isSubmitting}
                className="px-4 py-2.5 bg-secondary rounded-lg text-sm font-medium min-h-[44px] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="w-full border border-dashed border-border rounded-lg p-3 flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors text-sm font-medium min-h-[44px]"
          >
            <FontAwesomeIcon icon={iconPlus} className="w-4 h-4" /> Adicionar próximo frete
          </button>
        ))}

      <Dialog
        open={!!startBlockedFreight}
        onOpenChange={(open) =>
          !open && !isHandingOffFreight && setStartBlockedFreight(null)
        }
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Já existe um frete em andamento</DialogTitle>
            <DialogDescription>
              {startBlockedFreight && activeFreight
                ? `O trecho ${activeFreight.origin} → ${activeFreight.destination} ainda está rodando. Para iniciar ${startBlockedFreight.origin} → ${startBlockedFreight.destination}, conclua o atual primeiro.`
                : "Conclua o trecho atual antes de iniciar outro frete planejado."}
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg bg-secondary/50 p-3 text-xs leading-relaxed text-muted-foreground">
            Esse hand-off evita trocar o frete ativo sem clareza. Assim o histórico operacional da viagem continua previsível.
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <button
              className="w-full rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground min-h-[44px] disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
              disabled={isHandingOffFreight}
              onClick={handleConfirmFreightHandOff}
            >
              {isHandingOffFreight ? (
                <>
                  <FontAwesomeIcon icon={iconLoader2} className="w-4 h-4 animate-spin" /> Processando...
                </>
              ) : (
                "Concluir atual e iniciar este"
              )}
            </button>
            <button
              className="w-full rounded-md border px-3 py-2 text-sm font-semibold min-h-[44px] disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={isHandingOffFreight}
              onClick={() => setStartBlockedFreight(null)}
            >
              Cancelar
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editingReceivableFreight}
        onOpenChange={(open) => !open && !isSavingReceivable && setEditingReceivableFreight(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{(editingReceivableFreight?.receivableMode ?? "off") === "basic" ? "Registrar recebimento" : "Painel de recebimento"}</DialogTitle>
            <DialogDescription>
              {editingReceivableFreight?.status === "completed"
                ? "Agora dá para revisar previsão de pagamento, canhoto e ajustes opcionais."
                : "Enquanto o frete está em andamento, mostramos só o que você usa na estrada."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="rounded-md border border-border/60 bg-secondary/30 p-2 text-xs text-muted-foreground">
              {editingReceivableFreight && `${editingReceivableFreight.origin} → ${editingReceivableFreight.destination}`}
            </div>
            {editingReceivableFreight?.status === "completed" && (
              <label className="space-y-1 text-sm text-foreground">
                <span className="text-xs font-medium text-muted-foreground">Previsão de pagamento</span>
                <input
                  type="date"
                  value={editPaymentDueDate}
                  onChange={(e) => setEditPaymentDueDate(e.target.value)}
                  className="input-field"
                  disabled={isSavingReceivable}
                />
              </label>
            )}

            {(editingReceivableFreight?.receivableMode ?? "off") === "complete" && (
              <>
                <label className="space-y-1 text-sm text-foreground">
                  <span className="text-xs font-medium text-muted-foreground">Adiantamento</span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${editAdvanceInputMode === "currency" ? "border-primary text-primary" : "border-border text-muted-foreground"}`}
                      onClick={() => setEditAdvanceInputMode("currency")}
                      disabled={isSavingReceivable}
                    >
                      Em dinheiro
                    </button>
                    <button
                      type="button"
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${editAdvanceInputMode === "percentage" ? "border-primary text-primary" : "border-border text-muted-foreground"}`}
                      onClick={() => setEditAdvanceInputMode("percentage")}
                      disabled={isSavingReceivable}
                    >
                      Em %
                    </button>
                  </div>

                  {editAdvanceInputMode === "currency" ? (
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="0,00"
                      value={editAdvanceCurrencyInput}
                      onChange={(e) => {
                        setEditAdvanceCurrencyInput(e.target.value);
                        setEditAdvanceAmount(String(parseCurrencyInput(e.target.value)));
                      }}
                      className="input-field"
                      disabled={isSavingReceivable}
                    />
                  ) : (
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        {[80, 70, 50].map((percent) => (
                          <button
                            key={percent}
                            type="button"
                            className="rounded-full border border-border px-2.5 py-1 text-xs font-semibold text-foreground"
                            onClick={() => {
                              const grossValue = editingReceivableFreight?.grossValue ?? 0;
                              const amount = (grossValue * percent) / 100;
                              setEditAdvancePercent(String(percent));
                              setEditAdvanceAmount(String(amount));
                              setEditAdvanceCurrencyInput(formatCurrencyInput(amount));
                            }}
                            disabled={isSavingReceivable}
                          >
                            {percent}%
                          </button>
                        ))}
                      </div>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        placeholder="Percentual"
                        value={editAdvancePercent}
                        onChange={(e) => {
                          const percent = Number(e.target.value || 0);
                          const grossValue = editingReceivableFreight?.grossValue ?? 0;
                          const amount = (grossValue * percent) / 100;
                          setEditAdvancePercent(e.target.value);
                          setEditAdvanceAmount(String(amount));
                          setEditAdvanceCurrencyInput(formatCurrencyInput(amount));
                        }}
                        className="input-field"
                        disabled={isSavingReceivable}
                      />
                      <p className="text-xs text-muted-foreground">
                        {`${editAdvancePercent || 0}% de ${formatCurrency(editingReceivableFreight?.grossValue ?? 0)} = ${formatCurrency(Number(editAdvanceAmount || 0))}`}
                      </p>
                    </div>
                  )}
                </label>

                <label className="space-y-1 text-sm text-foreground">
                  <span className="text-xs font-medium text-muted-foreground">Quem paga</span>
                  <input
                    type="text"
                    value={editPayerName}
                    onChange={(e) => setEditPayerName(e.target.value)}
                    className="input-field"
                    disabled={isSavingReceivable}
                  />
                </label>
              </>
            )}

            {(editingReceivableFreight?.receivableMode ?? "off") === "complete" &&
              editingReceivableFreight?.status === "completed" && (
                <>
                  <label className="space-y-1 text-sm text-foreground">
                    <span className="text-xs font-medium text-muted-foreground">Canhoto para liberar saldo</span>
                    <select
                      value={editProofRequirement}
                      onChange={(e) => setEditProofRequirement(e.target.value as SimplifiedProofRequirement)}
                      className="input-field"
                      disabled={isSavingReceivable}
                    >
                      <option value="none">Não precisa de canhoto</option>
                      <option value="photo">Precisa enviar foto do canhoto</option>
                      <option value="physical">Precisa enviar canhoto físico</option>
                    </select>
                  </label>

                  <div className="rounded-md border border-border/70 p-2 space-y-2">
                    <button
                      type="button"
                      className="w-full text-left text-xs font-semibold text-foreground"
                      onClick={() => setShowAdjustmentEditor((current) => !current)}
                      disabled={isSavingReceivable}
                    >
                      {showAdjustmentEditor ? "Ocultar ajuste no saldo" : "Adicionar desconto ou acréscimo"}
                    </button>
                    {showAdjustmentEditor && (
                      <>
                        <div className="grid grid-cols-2 gap-2">
                          <select
                            value={quickAdjustmentType}
                            onChange={(e) => setQuickAdjustmentType(e.target.value as "discount" | "increase")}
                            className="input-field"
                            aria-label="Tipo do ajuste"
                            disabled={isSavingReceivable}
                          >
                            <option value="discount">Desconto</option>
                            <option value="increase">Acréscimo</option>
                          </select>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="Valor"
                            value={quickAdjustmentAmount}
                            onChange={(e) => setQuickAdjustmentAmount(e.target.value)}
                            className="input-field"
                            aria-label="Valor do ajuste"
                            disabled={isSavingReceivable}
                          />
                        </div>
                        <input
                          type="text"
                          maxLength={120}
                          placeholder="Observação curta"
                          value={quickAdjustmentNote}
                          onChange={(e) => setQuickAdjustmentNote(e.target.value)}
                          className="input-field"
                          aria-label="Observação do ajuste"
                          disabled={isSavingReceivable}
                        />
                      </>
                    )}
                  </div>
                </>
              )}

            <label className="space-y-1 text-sm text-foreground">
              <span className="text-xs font-medium text-muted-foreground">Valor recebido (R$)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={editAmountReceived}
                onChange={(e) => setEditAmountReceived(e.target.value)}
                className="input-field"
                disabled={isSavingReceivable}
              />
            </label>
          </div>

          <DialogFooter>
            <button
              type="button"
              className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground min-h-[44px] disabled:opacity-60"
              onClick={handleSaveReceivable}
              disabled={isSavingReceivable}
            >
              {isSavingReceivable ? "Salvando..." : "Salvar recebimento"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isModeChooserOpen}
        onOpenChange={(open) => {
          if (open || isSavingMode) return;
          setIsModeChooserOpen(false);
          setPostCreateFreightId(null);
          setPostCreateModeFreight(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Quer controlar o recebimento deste frete?</DialogTitle>
            <DialogDescription>
              Escolha agora e ajuste depois quando quiser. O frete continua simples por padrão.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <button type="button" disabled={isSavingMode} onClick={() => void handleSelectReceivableMode("off")} className="min-h-[44px] rounded-lg border px-3 py-2 text-left text-sm font-semibold">
              Não usar
              <span className="mt-1 block text-xs font-normal text-muted-foreground">
                Deixa o frete limpo, sem controle de recebimento.
              </span>
            </button>
            <button type="button" disabled={isSavingMode} onClick={() => void handleSelectReceivableMode("basic")} className="min-h-[44px] rounded-lg border px-3 py-2 text-left text-sm font-semibold">
              Básico
              <span className="mt-1 block text-xs font-normal text-muted-foreground">
                Mostra recebido, saldo e previsão de pagamento.
              </span>
            </button>
            <button type="button" disabled={isSavingMode} onClick={() => void handleSelectReceivableMode("complete")} className="min-h-[44px] rounded-lg border px-3 py-2 text-left text-sm font-semibold">
              Completo
              <span className="mt-1 block text-xs font-normal text-muted-foreground">
                Libera recebimentos, comprovante, ajustes e controle completo.
              </span>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!finishingFreight}
        onOpenChange={(open) =>
          !open && !isFinishingFreight && setFinishingFreight(null)
        }
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Concluir este frete?</DialogTitle>
            <DialogDescription>
              {finishingFreight
                ? `Você vai encerrar o trecho ${finishingFreight.origin} → ${finishingFreight.destination}. Se houver outro frete planejado, dá para iniciar na sequência.`
                : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg bg-secondary/50 p-3 text-xs text-muted-foreground leading-relaxed">
            Toque em{" "}
            <span className="font-semibold text-foreground">
              Iniciar próximo frete
            </span>{" "}
            para já seguir com o próximo trecho planejado. Se preferir, conclua
            só este frete e decida depois.
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <button
              className="w-full rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground min-h-[44px] disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
              disabled={isFinishingFreight}
              onClick={() => handleCompleteWithOption("start_next_if_planned")}
            >
              {isFinishingFreight ? (
                <>
                  <FontAwesomeIcon icon={iconLoader2} className="w-4 h-4 animate-spin" /> Concluindo...
                </>
              ) : (
                "Concluir e iniciar próximo"
              )}
            </button>
            <button
              className="w-full rounded-md border px-3 py-2 text-sm font-semibold min-h-[44px] disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={isFinishingFreight}
              onClick={() => handleCompleteWithOption("complete_only")}
            >
              Concluir e decidir depois
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!postCompletionForecastFreight}
        onOpenChange={(open) => !open && !isSavingCompletionForecast && setPostCompletionForecastFreight(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ainda falta receber o saldo</DialogTitle>
            <DialogDescription>
              Quer registrar a previsão de pagamento agora?
            </DialogDescription>
          </DialogHeader>
          <label className="space-y-1 text-sm text-foreground">
            <span className="text-xs font-medium text-muted-foreground">Previsão de pagamento</span>
            <input type="date" value={completionForecastDate} onChange={(e) => setCompletionForecastDate(e.target.value)} className="input-field" />
          </label>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <button type="button" onClick={handleSaveCompletionForecast} disabled={!completionForecastDate || isSavingCompletionForecast} className="w-full min-h-[44px] rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
              Informar data agora
            </button>
            <button type="button" onClick={() => setPostCompletionForecastFreight(null)} disabled={isSavingCompletionForecast} className="w-full min-h-[44px] rounded-lg border px-3 py-2 text-sm font-semibold">
              Pular por enquanto
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editingKmFreight}
        onOpenChange={(open) =>
          !open && !isSavingKm && setEditingKmFreight(null)
        }
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar KM inicial</DialogTitle>
            <DialogDescription>
              Ajuste o KM inicial deste trecho enquanto ele ainda não foi fechado. O progresso e as leituras da viagem serão recalculados.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <input
              value={editKmInitial}
              onChange={(e) => setEditKmInitial(e.target.value)}
              type="number"
              min="0"
              className="input-field"
              disabled={isSavingKm}
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveKmEdit}
                disabled={isSavingKm}
                className="flex-1 gradient-profit text-primary-foreground rounded-lg py-2.5 text-sm font-bold min-h-[44px] disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
              >
                {isSavingKm ? (
                  <>
                    <FontAwesomeIcon icon={iconLoader2} className="w-4 h-4 animate-spin" /> Salvando...
                  </>
                ) : (
                  "Salvar ajuste"
                )}
              </button>
              <button
                onClick={() => setEditingKmFreight(null)}
                disabled={isSavingKm}
                className="px-4 py-2.5 bg-secondary rounded-lg text-sm font-medium min-h-[44px] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!routeReviewFreight}
        onOpenChange={(open) =>
          !open && !isSavingRouteReview && setRouteReviewFreight(null)
        }
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Revisar origem e destino</DialogTitle>
            <DialogDescription>
              Confira origem e destino. Ao salvar de novo, o app tenta liberar a previsão deste trecho.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid gap-3">
              <CityAutocomplete
                placeholder="Origem"
                value={editOrigin}
                onChange={setEditOrigin}
                className="input-field"
              />
              <CityAutocomplete
                placeholder="Destino"
                value={editDestination}
                onChange={setEditDestination}
                className="input-field"
              />
            </div>
            <div className="rounded-lg bg-secondary/50 p-3 text-xs leading-relaxed text-muted-foreground">
              Você pode continuar usando a viagem normalmente. Esta revisão só tenta destravar a previsão de rota deste trecho.
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSaveRouteReview}
                disabled={
                  isSavingRouteReview ||
                  !editOrigin.trim() ||
                  !editDestination.trim()
                }
                className="flex-1 gradient-profit text-primary-foreground rounded-lg py-2.5 text-sm font-bold min-h-[44px] disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
              >
                {isSavingRouteReview ? (
                  <>
                    <FontAwesomeIcon icon={iconLoader2} className="w-4 h-4 animate-spin" /> Salvando...
                  </>
                ) : (
                  "Salvar e tentar liberar previsão"
                )}
              </button>
              <button
                onClick={() => setRouteReviewFreight(null)}
                disabled={isSavingRouteReview}
                className="px-4 py-2.5 bg-secondary rounded-lg text-sm font-medium min-h-[44px] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </div>

      <DeleteConfirmDialog
        open={!!freightToDelete}
        onOpenChange={(open) => {
          if (!open && !isDeletingFreight) setFreightToDelete(null);
        }}
        onConfirm={handleDeleteFreight}
        title={deleteDialogCopy.title}
        description={deleteDialogCopy.description}
        warning={deleteDialogCopy.warning}
        isLoading={isDeletingFreight}
      />
    </>
  );
}
