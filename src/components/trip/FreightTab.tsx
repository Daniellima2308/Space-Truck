import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Trip, Freight, Vehicle, FREIGHT_STATUS_LABELS, ReceivablePlanType } from "@/types";
import { formatCurrency, formatDate, formatNumber } from "@/lib/calculations";
import { sortFreightsByOperationalPriority } from "@/lib/freightStatus";
import {
  getFreightReceivableBadgeState,
  getFreightRemainingBalance,
  getFreightAdvanceReceived,
  getFreightAdjustedBalance,
  getFreightPlannedBalance,
  getFreightAdjustmentsNet,
  getFreightAmountReceivedForSettlement,
  getFreightReceivableTarget,
  type FreightReceivableBadgeState,
} from "@/lib/freightReceivables";
import { parseAdvancePercentInput } from "@/lib/freightReceivableInput";
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
import { FontAwesomeIcon, iconCheck, iconCheckCircle2, iconChevronDown, iconClock3, iconLoader2, iconMapPin, iconPlayCircle, iconPlus, iconReceipt, iconTrash2, iconRuler, iconWallet, iconPencil } from "@/lib/icons";

interface QuickBalanceAdjustmentSectionProps {
  expanded: boolean;
  onExpand: () => void;
  adjustmentType: "discount" | "increase";
  onChangeType: (value: "discount" | "increase") => void;
  adjustmentAmount: string;
  onChangeAmount: (value: string) => void;
  adjustmentNote: string;
  onChangeNote: (value: string) => void;
  disabled?: boolean;
  showOptionalTitle?: boolean;
}

function QuickBalanceAdjustmentSection({
  expanded,
  onExpand,
  adjustmentType,
  onChangeType,
  adjustmentAmount,
  onChangeAmount,
  adjustmentNote,
  onChangeNote,
  disabled = false,
  showOptionalTitle = false,
}: QuickBalanceAdjustmentSectionProps) {
  return (
    <div className="rounded-md border border-border/70 p-2 space-y-2">
      {!expanded ? (
        <button
          type="button"
          onClick={onExpand}
          className="w-full rounded-md border border-dashed border-border px-3 py-2 text-xs font-semibold text-muted-foreground min-h-[44px]"
          disabled={disabled}
        >
          Adicionar desconto ou acréscimo
        </button>
      ) : (
        <>
          {showOptionalTitle && (
            <p className="text-xs font-medium text-muted-foreground">Ajuste no saldo (opcional)</p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onChangeType("discount")}
                className={`min-h-[44px] rounded-md border px-2 py-2 text-xs font-semibold ${
                  adjustmentType === "discount"
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border text-muted-foreground"
                }`}
                disabled={disabled}
              >
                Desconto
              </button>
              <button
                type="button"
                onClick={() => onChangeType("increase")}
                className={`min-h-[44px] rounded-md border px-2 py-2 text-xs font-semibold ${
                  adjustmentType === "increase"
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border text-muted-foreground"
                }`}
                disabled={disabled}
              >
                Acréscimo
              </button>
            </div>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Valor"
              value={adjustmentAmount}
              onChange={(e) => onChangeAmount(e.target.value)}
              className="input-field"
              aria-label="Valor do ajuste"
              disabled={disabled}
            />
          </div>
          <input
            type="text"
            maxLength={120}
            placeholder="Observação curta"
            value={adjustmentNote}
            onChange={(e) => onChangeNote(e.target.value)}
            className="input-field"
            aria-label="Observação do ajuste"
            disabled={disabled}
          />
        </>
      )}
    </div>
  );
}

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

type ReceivableUiPlan = "undefined" | "advance_and_balance" | "paid_in_full" | "paid_on_delivery";
type AdvanceInputMode = "value" | "percent";
type MailReminderChoice = "off" | "tomorrow" | "day_after_tomorrow" | "pick_date";
type ActiveMailReminderChoice = Exclude<MailReminderChoice, "off">;

interface FreightMailReminder {
  choice: ActiveMailReminderChoice;
  date?: string;
}

const FREIGHT_MAIL_REMINDER_STORAGE_KEY = "space-truck:freight-mail-reminders:v1";

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
  const [origin, setOrigin] = useState("");
  const [dest, setDest] = useState("");
  const [km, setKm] = useState("");
  const [gross, setGross] = useState("");
  const [isModeChooserOpen, setIsModeChooserOpen] = useState(false);
  const [selectedModeChoice, setSelectedModeChoice] = useState<"off" | "basic" | "complete" | null>(null);
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
  const [editAdvanceAmount, setEditAdvanceAmount] = useState("");
  const [editReceivableUiPlan, setEditReceivableUiPlan] = useState<ReceivableUiPlan>("undefined");
  const [editAdvanceInputMode, setEditAdvanceInputMode] = useState<AdvanceInputMode>("value");
  const [advancePercentage, setAdvancePercentage] = useState("");
  const [editPayerName, setEditPayerName] = useState("");
  const [editBalanceReleaseMode, setEditBalanceReleaseMode] = useState<Freight["balanceReleaseMode"]>("none");
  const [showQuickAdjustment, setShowQuickAdjustment] = useState(false);
  const [quickAdjustmentType, setQuickAdjustmentType] = useState<"discount" | "increase">("discount");
  const [quickAdjustmentAmount, setQuickAdjustmentAmount] = useState("");
  const [quickAdjustmentNote, setQuickAdjustmentNote] = useState("");
  const [editingQuickAdjustmentIndex, setEditingQuickAdjustmentIndex] = useState<number | null>(null);
  const [draftBalanceAdjustments, setDraftBalanceAdjustments] = useState<Freight["balanceAdjustments"]>([]);
  const [editMailReminderChoice, setEditMailReminderChoice] = useState<MailReminderChoice>("off");
  const [editMailReminderDate, setEditMailReminderDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinishingFreight, setIsFinishingFreight] = useState(false);
  const [isSavingKm, setIsSavingKm] = useState(false);
  const [isSavingRouteReview, setIsSavingRouteReview] = useState(false);
  const [isSavingReceivable, setIsSavingReceivable] = useState(false);
  const [isSettlingBalance, setIsSettlingBalance] = useState(false);
  const [postCompletionForecastFreight, setPostCompletionForecastFreight] = useState<Freight | null>(null);
  const [completionForecastDate, setCompletionForecastDate] = useState("");
  const [completionBalanceReleaseMode, setCompletionBalanceReleaseMode] = useState<Freight["balanceReleaseMode"]>("none");
  const [completionMailReminder, setCompletionMailReminder] = useState<MailReminderChoice>("off");
  const [completionMailReminderDate, setCompletionMailReminderDate] = useState("");
  const [completionShowQuickAdjustment, setCompletionShowQuickAdjustment] = useState(false);
  const [completionQuickAdjustmentType, setCompletionQuickAdjustmentType] = useState<"discount" | "increase">("discount");
  const [completionQuickAdjustmentAmount, setCompletionQuickAdjustmentAmount] = useState("");
  const [completionQuickAdjustmentNote, setCompletionQuickAdjustmentNote] = useState("");
  const [isSavingCompletionForecast, setIsSavingCompletionForecast] = useState(false);
  const [expandedReceivableId, setExpandedReceivableId] = useState<string | null>(null);
  const [pendingStartId, setPendingStartId] = useState<string | null>(null);
  const [startBlockedFreight, setStartBlockedFreight] = useState<Freight | null>(null);
  const [isHandingOffFreight, setIsHandingOffFreight] = useState(false);
  const [freightToDelete, setFreightToDelete] = useState<Freight | null>(null);
  const [isDeletingFreight, setIsDeletingFreight] = useState(false);
  const [mailReminderByFreight, setMailReminderByFreight] = useState<Record<string, FreightMailReminder>>({});
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

  useEffect(() => {
    setMailReminderByFreight(getMailRemindersFromStorage());
  }, []);

  const persistMailReminderState = (nextState: Record<string, FreightMailReminder>) => {
    setMailReminderByFreight(nextState);
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      FREIGHT_MAIL_REMINDER_STORAGE_KEY,
      JSON.stringify(nextState),
    );
  };

  const statusClassByFreight: Record<Freight["status"], string> = {
    planned: "bg-secondary text-muted-foreground border-border",
    in_progress: "bg-warning/15 text-warning border-warning/30",
    completed: "bg-profit/15 text-profit border-profit/30",
  };
  const receivableStatusClass: Record<FreightReceivableBadgeState, string> = {
    undefined: "bg-secondary text-muted-foreground border-border",
    after_delivery: "bg-secondary text-muted-foreground border-border",
    awaiting_balance: "bg-info/15 text-info border-info/30",
    awaiting_proof: "bg-warning/15 text-warning border-warning/30",
    due_today: "bg-warning/15 text-warning border-warning/30",
    overdue: "bg-expense/15 text-expense border-expense/30",
    received: "bg-profit/15 text-profit border-profit/30",
  };
  const receivableStatusLabel: Record<FreightReceivableBadgeState, string> = {
    undefined: "Não definido",
    after_delivery: "Após descarga",
    awaiting_balance: "Aguardando saldo",
    awaiting_proof: "Aguardando canhoto",
    due_today: "Vence hoje",
    overdue: "Atrasado",
    received: "Quitado",
  };
  const normalizeBalanceReleaseMode = (
    value: Freight["balanceReleaseMode"] | undefined,
  ): Freight["balanceReleaseMode"] => {
    if (
      value === "none" ||
      value === "proof_photo" ||
      value === "physical_proof" ||
      value === "agreed_deadline" ||
      value === "direct_delivery"
    ) {
      return value;
    }
    return "none";
  };

  const getAdvanceAmountFromInput = (grossValue: number) => {
    if (editAdvanceInputMode === "percent") {
      const parsed = parseAdvancePercentInput(advancePercentage);
      if (parsed.value === null) {
        return { amount: NaN, percentage: null, parseError: parsed.error };
      }
      return { amount: (grossValue * parsed.value) / 100, percentage: parsed.value, parseError: undefined };
    }
    return { amount: Number(editAdvanceAmount || 0), percentage: null, parseError: undefined };
  };

  const formatPercentFromAdvance = (advanceAmount: number, grossValue: number): string => {
    if (!Number.isFinite(advanceAmount) || !Number.isFinite(grossValue) || grossValue <= 0) return "";
    const percentage = (advanceAmount / grossValue) * 100;
    if (!Number.isFinite(percentage)) return "";
    return Number(percentage.toFixed(2)).toString();
  };

  const getMailRemindersFromStorage = (): Record<string, FreightMailReminder> => {
    if (typeof window === "undefined") return {};
    try {
      const rawValue = window.localStorage.getItem(FREIGHT_MAIL_REMINDER_STORAGE_KEY);
      if (!rawValue) return {};
      const parsed = JSON.parse(rawValue) as Record<string, FreightMailReminder>;
      if (!parsed || typeof parsed !== "object") return {};
      return Object.entries(parsed).reduce<Record<string, FreightMailReminder>>((acc, [freightId, reminder]) => {
        if (!reminder || typeof reminder !== "object") return acc;
        if (reminder.choice !== "tomorrow" && reminder.choice !== "day_after_tomorrow" && reminder.choice !== "pick_date") return acc;
        acc[freightId] = {
          choice: reminder.choice,
          date: typeof reminder.date === "string" ? reminder.date : undefined,
        };
        return acc;
      }, {});
    } catch {
      return {};
    }
  };

  const getMailReminderLabel = (reminder: FreightMailReminder | undefined): string | null => {
    if (!reminder) return null;
    if (reminder.choice === "tomorrow") return "amanhã";
    if (reminder.choice === "day_after_tomorrow") return "depois de amanhã";
    if (reminder.choice === "pick_date") {
      if (!reminder.date) return "data não definida";
      return formatDate(reminder.date);
    }
    return null;
  };

  const receivablePlanLabel: Record<ReceivableUiPlan, string> = {
    undefined: "Não definido",
    advance_and_balance: "Adiantamento e saldo",
    paid_in_full: "Pago integralmente",
    paid_on_delivery: "Pagamento após a descarga",
  };

  const getUiPlanFromPlanType = (planType: ReceivablePlanType): ReceivableUiPlan => {
    if (planType === "paid_in_full") return "paid_in_full";
    if (planType === "paid_on_delivery") return "paid_on_delivery";
    if (planType === "advance_value" || planType === "advance_percent") return "advance_and_balance";
    return "undefined";
  };

  const getPlanTypeFromUiPlan = (uiPlan: ReceivableUiPlan, advanceMode: AdvanceInputMode): ReceivablePlanType => {
    if (uiPlan === "advance_and_balance") {
      return advanceMode === "percent" ? "advance_percent" : "advance_value";
    }
    if (uiPlan === "paid_in_full") return "paid_in_full";
    if (uiPlan === "paid_on_delivery") return "paid_on_delivery";
    return "undefined";
  };

  const buildReceivableSummary = (
    freight: Freight,
    originalBalance: number,
    hasAdjustments: boolean,
    hasMailReminder: boolean,
  ): string[] => {
    const uiPlan = getUiPlanFromPlanType(freight.receivablePlanType ?? "undefined");
    if (uiPlan === "undefined") return ["Sem configuração de recebimento"];
    if (uiPlan === "paid_in_full") return ["Frete pago por inteiro"];
    if (uiPlan === "paid_on_delivery") {
      return [freight.status === "completed" && !freight.paymentDueDate
        ? "Falta definir previsão após descarga"
        : freight.status === "completed"
          ? "Pagamento previsto após a descarga"
          : "Pagamento após descarga"];
    }
    const adjustmentParts = hasAdjustments
      ? (freight.balanceAdjustments ?? []).map((adjustment) => (
        `${adjustment.type === "discount" ? "-" : "+"} ${formatCurrency(adjustment.amount)}`
      ))
      : [];
    const lines = [
      `Adiantamento ${formatCurrency(freight.advanceAmount ?? 0)}`,
      `Saldo ${formatCurrency(originalBalance)}${adjustmentParts.length > 0 ? ` ${adjustmentParts.join(" ")}` : ""}`,
    ];
    if (hasMailReminder) lines.push("lembrete ativo");
    return lines;
  };

  const getPaymentContextLine = (freight: Freight, remainingBalance: number): string | null => {
    if (freight.status !== "completed" || remainingBalance <= 0) return null;
    if (!freight.paymentDueDate) return "Sem previsão informada";
    const releaseMode = freight.balanceReleaseMode ?? "none";
    const deliveryProofStatus = freight.deliveryProofStatus ?? "not_required";
    if (deliveryProofStatus === "confirmed") return null;
    if (releaseMode === "proof_photo") {
      return "Necessário enviar foto do canhoto";
    }
    if (releaseMode === "physical_proof") {
      return "Necessário enviar canhoto físico";
    }
    return null;
  };

  const resolveDeliveryProofStatus = (
    previousStatus: Freight["deliveryProofStatus"] | undefined,
    nextBalanceReleaseMode: Freight["balanceReleaseMode"],
  ): NonNullable<Freight["deliveryProofStatus"]> => {
    if (previousStatus === "sent" || previousStatus === "confirmed") return previousStatus;
    if (nextBalanceReleaseMode === "none" || nextBalanceReleaseMode === "direct_delivery") {
      return "not_required";
    }
    return "pending_send";
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
    setSelectedModeChoice(mode);
    if (mode === "off") {
      setIsModeChooserOpen(false);
      setPostCreateFreightId(null);
      setPostCreateModeFreight(null);
      setSelectedModeChoice(null);
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
      setSelectedModeChoice(null);
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
      setSelectedModeChoice(null);
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
      if (isReceivableActive) {
        setCompletionForecastDate(latestFreight.paymentDueDate ?? "");
        setCompletionBalanceReleaseMode(normalizeBalanceReleaseMode(latestFreight.balanceReleaseMode));
        const existingReminder = mailReminderByFreight[latestFreight.id];
        setCompletionMailReminder(existingReminder?.choice ?? "off");
        setCompletionMailReminderDate(existingReminder?.date ?? "");
        setCompletionShowQuickAdjustment(false);
        setCompletionQuickAdjustmentType("discount");
        setCompletionQuickAdjustmentAmount("");
        setCompletionQuickAdjustmentNote("");
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
    const latestFreight = getLatestFreight(postCompletionForecastFreight.id) ?? postCompletionForecastFreight;
    const parsedAdjustmentAmount = Number(completionQuickAdjustmentAmount || 0);
    if (
      completionQuickAdjustmentAmount.trim() &&
      (!Number.isFinite(parsedAdjustmentAmount) || parsedAdjustmentAmount <= 0)
    ) {
      toast({
        title: "Ajuste no saldo inválido",
        description: "Use um valor maior que zero para desconto ou acréscimo.",
        variant: "destructive",
      });
      return;
    }
    if (completionMailReminder === "pick_date" && !completionMailReminderDate) {
      toast({
        title: "Lembrete de correio incompleto",
        description: "Escolha uma data para salvar esse lembrete.",
        variant: "destructive",
      });
      return;
    }
    const nextAdjustments = Array.isArray(latestFreight.balanceAdjustments)
      ? [...latestFreight.balanceAdjustments]
      : [];
    if (completionQuickAdjustmentAmount.trim() && parsedAdjustmentAmount > 0) {
      nextAdjustments.push({
        type: completionQuickAdjustmentType,
        amount: parsedAdjustmentAmount,
        note: completionQuickAdjustmentNote.trim() || undefined,
      });
    }
    try {
      setIsSavingCompletionForecast(true);
      await updateFreight(trip.id, latestFreight.id, {
        origin: latestFreight.origin,
        destination: latestFreight.destination,
        kmInitial: latestFreight.kmInitial,
        grossValue: latestFreight.grossValue,
        paymentDueDate: completionForecastDate || undefined,
        amountReceived: latestFreight.amountReceived,
        advanceAmount: latestFreight.advanceAmount,
        payerName: latestFreight.payerName,
        deliveryProofStatus: resolveDeliveryProofStatus(
          latestFreight.deliveryProofStatus,
          completionBalanceReleaseMode,
        ),
        balanceReleaseMode: completionBalanceReleaseMode,
        balanceAdjustments: nextAdjustments,
        receivablePlanType: latestFreight.receivablePlanType,
        receivableMode: latestFreight.receivableMode,
        commissionPercent: latestFreight.commissionPercent,
      });
      if (completionMailReminder === "off") {
        const { [latestFreight.id]: _, ...nextState } = mailReminderByFreight;
        persistMailReminderState(nextState);
      } else {
        persistMailReminderState({
          ...mailReminderByFreight,
          [latestFreight.id]: {
            choice: completionMailReminder,
            date: completionMailReminder === "pick_date" ? completionMailReminderDate || undefined : undefined,
          },
        });
      }
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
    if (editingReceivableFreight?.id === freight.id) {
      setEditingReceivableFreight(null);
      return;
    }
    const normalizedPlanType = freight.receivablePlanType ?? "undefined";
    const uiPlan = getUiPlanFromPlanType(normalizedPlanType);
    const advanceInputMode: AdvanceInputMode = normalizedPlanType === "advance_percent" ? "percent" : "value";
    setEditingReceivableFreight(freight);
    setEditPaymentDueDate(freight.paymentDueDate ?? "");
    setEditAdvanceAmount(String(freight.advanceAmount ?? 0));
    setEditReceivableUiPlan(uiPlan);
    setEditAdvanceInputMode(advanceInputMode);
    setAdvancePercentage(
      freight.grossValue > 0 && normalizedPlanType === "advance_percent"
        ? formatPercentFromAdvance(freight.advanceAmount ?? 0, freight.grossValue)
        : "",
    );
    setEditPayerName(freight.payerName ?? "");
    setEditBalanceReleaseMode(normalizeBalanceReleaseMode(freight.balanceReleaseMode));
    setShowQuickAdjustment(false);
    setQuickAdjustmentType("discount");
    setQuickAdjustmentAmount("");
    setQuickAdjustmentNote("");
    setEditingQuickAdjustmentIndex(null);
    setDraftBalanceAdjustments(
      Array.isArray(freight.balanceAdjustments) ? [...freight.balanceAdjustments] : [],
    );
    const existingReminder = mailReminderByFreight[freight.id];
    setEditMailReminderChoice(existingReminder?.choice ?? "off");
    setEditMailReminderDate(existingReminder?.date ?? "");
  };

  const handleEditAdjustment = (adjustmentIndex: number) => {
    const adjustment = draftBalanceAdjustments?.[adjustmentIndex];
    if (!adjustment) return;
    setShowQuickAdjustment(true);
    setEditingQuickAdjustmentIndex(adjustmentIndex);
    setQuickAdjustmentType(adjustment.type);
    setQuickAdjustmentAmount(String(adjustment.amount));
    setQuickAdjustmentNote(adjustment.note ?? "");
  };

  const handleDeleteAdjustment = (adjustmentIndex: number) => {
    setDraftBalanceAdjustments((current) =>
      (current ?? []).filter((_, index) => index !== adjustmentIndex),
    );
    if (editingQuickAdjustmentIndex === adjustmentIndex) {
      setEditingQuickAdjustmentIndex(null);
      setQuickAdjustmentAmount("");
      setQuickAdjustmentNote("");
      setQuickAdjustmentType("discount");
      setShowQuickAdjustment(false);
    }
  };

  const handleApplyQuickAdjustmentDraft = () => {
    const parsedQuickAdjustmentAmount = Number(quickAdjustmentAmount || 0);
    if (!Number.isFinite(parsedQuickAdjustmentAmount) || parsedQuickAdjustmentAmount <= 0) {
      toast({
        title: "Ajuste no saldo inválido",
        description: "Use um valor maior que zero para desconto ou acréscimo.",
        variant: "destructive",
      });
      return;
    }

    setDraftBalanceAdjustments((current) => {
      const base = Array.isArray(current) ? [...current] : [];
      const nextValue = {
        type: quickAdjustmentType,
        amount: parsedQuickAdjustmentAmount,
        note: quickAdjustmentNote.trim() || undefined,
      };

      if (editingQuickAdjustmentIndex !== null && base[editingQuickAdjustmentIndex]) {
        base[editingQuickAdjustmentIndex] = nextValue;
        return base;
      }
      base.push(nextValue);
      return base;
    });

    setEditingQuickAdjustmentIndex(null);
    setShowQuickAdjustment(false);
    setQuickAdjustmentType("discount");
    setQuickAdjustmentAmount("");
    setQuickAdjustmentNote("");
  };

  const persistReceivable = async (options?: { settleRemaining?: boolean }) => {
    if (!editingReceivableFreight || isSavingReceivable) return;
    const shouldSettleRemaining = options?.settleRemaining ?? false;
    const latestFreight =
      getLatestFreight(editingReceivableFreight.id) ?? editingReceivableFreight;
    const normalizedPlanType = getPlanTypeFromUiPlan(editReceivableUiPlan, editAdvanceInputMode);
    if (normalizedPlanType === "advance_percent") {
      const parsed = parseAdvancePercentInput(advancePercentage);
      if (parsed.value === null) {
        toast({
          title: "Percentual de adiantamento inválido",
          description: parsed.error ?? "Informe um percentual entre 0 e 100.",
          variant: "destructive",
        });
        return;
      }
      setAdvancePercentage(parsed.normalized);
    }
    const parsedAmountReceived = Number(latestFreight.amountReceived || 0);
    const parsedAdvanceInput = getAdvanceAmountFromInput(latestFreight.grossValue);
    if (normalizedPlanType === "advance_percent") {
      const parsedAdvancePercent = parsedAdvanceInput.percentage;
      if (
        parsedAdvancePercent === null ||
        !Number.isFinite(parsedAdvancePercent) ||
        parsedAdvancePercent < 0 ||
        parsedAdvancePercent > 100 ||
        !Number.isFinite(parsedAdvanceInput.amount) ||
        parsedAdvanceInput.amount < 0
      ) {
        toast({
          title: "Adiantamento inválido",
          description: parsedAdvanceInput.parseError ?? "Informe um percentual entre 0 e 100.",
          variant: "destructive",
        });
        return;
      }
    }
    const parsedAdvanceAmount = normalizedPlanType === "advance_value" || normalizedPlanType === "advance_percent"
      ? parsedAdvanceInput.amount
      : 0;
    const currentTarget = getFreightReceivableTarget({
      grossValue: latestFreight.grossValue,
      receivablePlanType: normalizedPlanType,
      balanceAdjustments: latestFreight.balanceAdjustments,
    });
    let normalizedAmountReceived = (() => {
      if (normalizedPlanType === "paid_in_full") {
        return currentTarget;
      }
      if (normalizedPlanType === "advance_value" || normalizedPlanType === "advance_percent") {
        return Math.max(parsedAmountReceived, parsedAdvanceAmount);
      }
      return parsedAmountReceived;
    })();
    if (!Number.isFinite(normalizedAmountReceived) || normalizedAmountReceived < 0) {
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
    if ((normalizedPlanType === "advance_value" || normalizedPlanType === "advance_percent") && parsedAdvanceAmount > latestFreight.grossValue) {
      toast({
        title: "Adiantamento inválido",
        description: "O adiantamento não pode ser maior que o valor bruto do frete.",
        variant: "destructive",
      });
      return;
    }
    if (editMailReminderChoice === "pick_date" && !editMailReminderDate) {
      toast({
        title: "Lembrete de correio incompleto",
        description: "Escolha uma data para salvar esse lembrete.",
        variant: "destructive",
      });
      return;
    }
    const nextAdjustments = Array.isArray(draftBalanceAdjustments)
      ? draftBalanceAdjustments
      : [];
    if (shouldSettleRemaining) {
      normalizedAmountReceived = getFreightAmountReceivedForSettlement({
        grossValue: latestFreight.grossValue,
        receivablePlanType: normalizedPlanType,
        balanceAdjustments: nextAdjustments,
        advanceAmount: parsedAdvanceAmount,
        amountReceived: normalizedAmountReceived,
      });
    }

    try {
      setIsSavingReceivable(true);
      const result = await updateFreight(trip.id, latestFreight.id, {
        origin: latestFreight.origin,
        destination: latestFreight.destination,
        kmInitial: latestFreight.kmInitial,
        grossValue: latestFreight.grossValue,
        paymentDueDate: editPaymentDueDate || undefined,
        amountReceived: normalizedAmountReceived,
        advanceAmount: parsedAdvanceAmount,
        payerName: editPayerName.trim() || undefined,
        deliveryProofStatus: resolveDeliveryProofStatus(
          latestFreight.deliveryProofStatus,
          editBalanceReleaseMode,
        ),
        balanceReleaseMode: editBalanceReleaseMode,
        balanceAdjustments: nextAdjustments,
        receivablePlanType: normalizedPlanType,
        commissionPercent: latestFreight.commissionPercent,
      });

      if (result.status === "blocked") {
        return;
      }

      if (editMailReminderChoice === "off") {
        const { [latestFreight.id]: _, ...nextState } = mailReminderByFreight;
        persistMailReminderState(nextState);
      } else {
        persistMailReminderState({
          ...mailReminderByFreight,
          [latestFreight.id]: {
            choice: editMailReminderChoice,
            date: editMailReminderChoice === "pick_date" ? editMailReminderDate || undefined : undefined,
          },
        });
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

  const handleSaveReceivable = async () => {
    await persistReceivable();
  };

  const handleMarkRemainingAsPaid = async (freight: Freight, options?: { requireConfirm?: boolean }) => {
    if (isSettlingBalance || isSavingReceivable) return;
    const latestFreight = getLatestFreight(freight.id) ?? freight;
    const remainingBalance = getFreightRemainingBalance(latestFreight);
    if (remainingBalance <= 0) return;
    if (options?.requireConfirm !== false) {
      const confirmed = window.confirm("Confirmar quitação do saldo deste frete?");
      if (!confirmed) return;
    }

    try {
      setIsSettlingBalance(true);
      const nextAmountReceived = getFreightAmountReceivedForSettlement({
        grossValue: latestFreight.grossValue,
        receivablePlanType: latestFreight.receivablePlanType ?? "undefined",
        balanceAdjustments: latestFreight.balanceAdjustments,
        amountReceived: latestFreight.amountReceived,
        advanceAmount: latestFreight.advanceAmount,
      });

      await updateFreight(trip.id, latestFreight.id, {
        origin: latestFreight.origin,
        destination: latestFreight.destination,
        kmInitial: latestFreight.kmInitial,
        grossValue: latestFreight.grossValue,
        paymentDueDate: latestFreight.paymentDueDate,
        amountReceived: nextAmountReceived,
        advanceAmount: latestFreight.advanceAmount,
        payerName: latestFreight.payerName,
        deliveryProofStatus: latestFreight.deliveryProofStatus,
        balanceReleaseMode: latestFreight.balanceReleaseMode,
        balanceAdjustments: latestFreight.balanceAdjustments,
        receivablePlanType: latestFreight.receivablePlanType,
        commissionPercent: latestFreight.commissionPercent,
      });
    } finally {
      setIsSettlingBalance(false);
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
          const receivableStatus = getFreightReceivableBadgeState(f);
          const remainingBalance = getFreightRemainingBalance(f);
          const historicalBalance = getFreightAdjustedBalance(f);
          const originalBalance = getFreightPlannedBalance(f);
          const adjustmentsNet = getFreightAdjustmentsNet(f);
          const reminderLabel = getMailReminderLabel(mailReminderByFreight[f.id]);
          const hasAdjustments = Array.isArray(f.balanceAdjustments) && f.balanceAdjustments.length > 0;
          const hasMailReminder = Boolean(reminderLabel);
          const advanceAmount = getFreightAdvanceReceived(f);
          const uiPlan = getUiPlanFromPlanType(f.receivablePlanType ?? "undefined");
          const isFreightCompleted = f.status === "completed";
          const isReceivableExpanded = expandedReceivableId === f.id;
          const canSettleRemaining = isFreightCompleted && uiPlan !== "undefined" && uiPlan !== "paid_in_full" && remainingBalance > 0;
          const receivableSummaryLines = buildReceivableSummary(
            f,
            originalBalance,
            hasAdjustments,
            hasMailReminder,
          );
          const paymentContextLine = getPaymentContextLine(f, remainingBalance);

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

          <div className="grid grid-cols-2 gap-2">
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
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                KM estimado
              </p>
              <p className="text-sm font-mono font-bold">
                {formatNumber(f.estimatedDistance || 0)} km
              </p>
            </div>
          </div>

          {f.estimatedDistance <= 0 && (
            <div className="rounded-lg border border-warning/30 bg-warning/10 p-3">
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

          {receivableEnabled && (
            <div className="rounded-xl border border-border/70 bg-background/80 shadow-sm">
              <button
                type="button"
                onClick={() => setExpandedReceivableId((current) => (current === f.id ? null : f.id))}
                className="flex min-h-[44px] w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
              >
                <div className="space-y-1">
                  <p className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"><FontAwesomeIcon icon={iconReceipt} className="h-3 w-3" /> Recebimento</p>
                  <div className="space-y-0.5">
                    {receivableSummaryLines.map((line) => (
                      <p key={line} className="text-xs leading-relaxed text-foreground">
                        {line}
                      </p>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${receivableStatusClass[receivableStatus]}`}
                  >
                    <FontAwesomeIcon icon={receivableStatus === "received" ? iconCheckCircle2 : iconClock3} className="h-2.5 w-2.5" />
                    {receivableStatusLabel[receivableStatus]}
                  </span>
                  <FontAwesomeIcon icon={iconChevronDown} className={`h-3 w-3 text-muted-foreground transition-transform ${isReceivableExpanded ? "rotate-180" : ""}`} />
                </div>
              </button>
              {isReceivableExpanded && (
                <div className="space-y-2 border-t border-border/60 px-3 py-2.5">
                  <p className="text-xs text-muted-foreground">Forma: <span className="text-foreground">{receivablePlanLabel[uiPlan]}</span></p>
                  {uiPlan === "advance_and_balance" && (
                    <p className="text-xs text-muted-foreground">Adiantamento: <span className="font-mono text-foreground">{formatCurrency(advanceAmount)}</span></p>
                  )}
                  {uiPlan === "advance_and_balance" && (
                    <p className="text-xs text-muted-foreground">Saldo: <span className="font-mono text-foreground">{formatCurrency(originalBalance)}</span></p>
                  )}
                  {uiPlan === "advance_and_balance" && hasAdjustments && (
                    <p className="text-xs text-muted-foreground">
                      Ajustes:{" "}
                      <span className="font-mono text-foreground">
                        {`${adjustmentsNet > 0 ? "+" : "-"}${formatCurrency(Math.abs(adjustmentsNet))}`}
                      </span>
                    </p>
                  )}
                  {uiPlan === "advance_and_balance" && hasAdjustments && (
                    <div className="space-y-1 rounded-md border border-border/60 bg-secondary/20 p-2">
                      <p className="text-[11px] font-medium text-muted-foreground">Histórico de ajustes</p>
                      {f.balanceAdjustments?.map((adjustment, index) => (
                        <p key={`${adjustment.type}-${adjustment.amount}-${index}`} className="text-xs text-foreground">
                          {adjustment.type === "discount" ? "Desconto" : "Acréscimo"} de {formatCurrency(adjustment.amount)}
                          {adjustment.note ? ` • ${adjustment.note}` : ""}
                        </p>
                      ))}
                    </div>
                  )}
                  {uiPlan === "advance_and_balance" && hasAdjustments && (
                    <p className="text-xs text-muted-foreground">Saldo reajustado: <span className="font-mono text-foreground">{formatCurrency(historicalBalance)}</span></p>
                  )}
                  {uiPlan === "paid_on_delivery" && (
                    <p className="text-xs text-muted-foreground">
                      {isFreightCompleted ? "Aguardando quitação após descarga" : "Pagamento após descarga, sem saldo exibido por enquanto"}
                    </p>
                  )}
                  {uiPlan === "paid_in_full" && (
                    <p className="text-xs text-muted-foreground">Frete sem saldo pendente</p>
                  )}
                  {f.payerName && (
                    <p className="text-xs text-muted-foreground">Quem paga: <span className="text-foreground">{f.payerName}</span></p>
                  )}
                  {isFreightCompleted && f.paymentDueDate && uiPlan !== "paid_in_full" && (
                    <p className="text-xs text-muted-foreground">Previsão do saldo: {formatDate(f.paymentDueDate)}</p>
                  )}
                  {reminderLabel && (
                    <p className="text-xs text-muted-foreground">Lembrete de correio: <span className="text-foreground">{reminderLabel}</span></p>
                  )}
                  {paymentContextLine && <p className="rounded-md border border-warning/30 bg-warning/10 px-2 py-1 text-xs text-warning">{paymentContextLine}</p>}
                  {isOpen && (
                    <div className="mt-1 flex flex-wrap gap-2">
                      <button
                        onClick={() => openReceivableDialog(f)}
                        className="inline-flex min-h-[44px] items-center gap-1 rounded-md border border-border/70 px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary"
                      >
                        <FontAwesomeIcon icon={iconPencil} className="w-3.5 h-3.5" /> {editingReceivableFreight?.id === f.id ? "Fechar edição" : (receivableMode === "basic" ? "Registrar recebimento" : "Editar recebimento")}
                      </button>
                      {canSettleRemaining && (
                        <button
                          onClick={() => void handleMarkRemainingAsPaid(f)}
                          disabled={isSettlingBalance}
                          className="inline-flex min-h-[44px] items-center rounded-md bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-60"
                        >
                          {isSettlingBalance ? "Quitando..." : "Marcar saldo como pago"}
                        </button>
                      )}
                    </div>
                  )}
                  {isOpen && editingReceivableFreight?.id === f.id && (
                    <div className="mt-2 space-y-3 rounded-lg border border-border/60 bg-secondary/20 p-3">
                      <label className="space-y-1 text-sm text-foreground">
                        <span className="text-xs font-medium text-muted-foreground">Como este frete será pago?</span>
                        <div className="grid grid-cols-1 gap-2">
                          {([
                            { value: "undefined", label: "Não definido" },
                            { value: "advance_and_balance", label: "Adiantamento e saldo" },
                            { value: "paid_in_full", label: "Pago integralmente" },
                            { value: "paid_on_delivery", label: "Pagamento após a descarga" },
                          ] as const).map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => setEditReceivableUiPlan(option.value)}
                              className={`min-h-[44px] rounded-lg border px-3 py-2 text-left text-sm ${
                                editReceivableUiPlan === option.value
                                  ? "border-primary bg-primary/10 text-foreground"
                                  : "border-border/70 text-muted-foreground hover:bg-secondary/40"
                              }`}
                              disabled={isSavingReceivable}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </label>

                      {editReceivableUiPlan === "advance_and_balance" && (
                        <>
                          <label className="space-y-1 text-sm text-foreground">
                            <span className="text-xs font-medium text-muted-foreground">Como digitar o adiantamento</span>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => setEditAdvanceInputMode("value")}
                                className={`min-h-[44px] rounded-lg border px-3 py-2 text-sm font-medium ${
                                  editAdvanceInputMode === "value"
                                    ? "border-primary bg-primary/10 text-foreground"
                                    : "border-border/70 text-muted-foreground hover:bg-secondary/40"
                                }`}
                                disabled={isSavingReceivable}
                              >
                                Valor
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditAdvanceInputMode("percent")}
                                className={`min-h-[44px] rounded-lg border px-3 py-2 text-sm font-medium ${
                                  editAdvanceInputMode === "percent"
                                    ? "border-primary bg-primary/10 text-foreground"
                                    : "border-border/70 text-muted-foreground hover:bg-secondary/40"
                                }`}
                                disabled={isSavingReceivable}
                              >
                                %
                              </button>
                            </div>
                          </label>
                          {editAdvanceInputMode === "value" ? (
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={editAdvanceAmount}
                              onChange={(e) => setEditAdvanceAmount(e.target.value)}
                              className="input-field"
                              disabled={isSavingReceivable}
                              placeholder="Ex.: 3.600,00"
                            />
                          ) : (
                            <input
                              type="text"
                              value={advancePercentage}
                              onChange={(e) => setAdvancePercentage(e.target.value)}
                              className="input-field"
                              disabled={isSavingReceivable}
                              aria-label="Porcentagem do adiantamento"
                              placeholder="Ex.: 80, 80% ou 80/20"
                            />
                          )}
                          {editAdvanceInputMode === "percent" && (
                            <div>
                              {(() => {
                                const parsed = parseAdvancePercentInput(advancePercentage);
                                const grossValue = editingReceivableFreight?.grossValue ?? 0;
                                if (parsed.value === null) {
                                  return (
                                    <p className="text-[11px] text-warning">
                                      {parsed.error}
                                    </p>
                                  );
                                }
                                return (
                                  <p className="text-[11px] text-muted-foreground">
                                    {`${parsed.value}% de ${formatCurrency(grossValue)} = `}
                                    <span className="font-mono text-foreground">
                                      {formatCurrency((grossValue * parsed.value) / 100)}
                                    </span>
                                  </p>
                                );
                              })()}
                            </div>
                          )}
                        </>
                      )}

                      <label className="space-y-1 text-sm text-foreground">
                        <span className="text-xs font-medium text-muted-foreground">Quem paga (opcional)</span>
                        <input
                          type="text"
                          value={editPayerName}
                          onChange={(e) => setEditPayerName(e.target.value)}
                          className="input-field"
                          disabled={isSavingReceivable}
                          placeholder="Ex.: Embarcador da carga"
                        />
                      </label>

                      {(editingReceivableFreight?.receivableMode ?? "off") === "complete" && editingReceivableFreight?.status === "completed" && editReceivableUiPlan !== "undefined" && editReceivableUiPlan !== "paid_in_full" && (
                        <label className="space-y-1 text-sm text-foreground">
                          <span className="text-xs font-medium text-muted-foreground">Canhoto para liberar saldo</span>
                          <div className="grid grid-cols-1 gap-2">
                            {([
                              { value: "none", label: "Canhoto: não precisa" },
                              { value: "proof_photo", label: "Canhoto: enviar foto" },
                              { value: "physical_proof", label: "Canhoto: enviar físico" },
                            ] as const).map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => setEditBalanceReleaseMode(option.value)}
                                className={`min-h-[44px] rounded-lg border px-3 py-2 text-left text-sm ${
                                  editBalanceReleaseMode === option.value
                                    ? "border-primary bg-primary/10 text-foreground"
                                    : "border-border/70 text-muted-foreground hover:bg-secondary/40"
                                }`}
                                disabled={isSavingReceivable}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        </label>
                      )}

                      {(editingReceivableFreight?.receivableMode ?? "off") === "complete" && editReceivableUiPlan !== "undefined" && editReceivableUiPlan !== "paid_in_full" && (
                        <QuickBalanceAdjustmentSection
                          expanded={showQuickAdjustment}
                          onExpand={() => setShowQuickAdjustment(true)}
                          adjustmentType={quickAdjustmentType}
                          onChangeType={setQuickAdjustmentType}
                          adjustmentAmount={quickAdjustmentAmount}
                          onChangeAmount={setQuickAdjustmentAmount}
                          adjustmentNote={quickAdjustmentNote}
                          onChangeNote={setQuickAdjustmentNote}
                          disabled={isSavingReceivable}
                          showOptionalTitle
                        />
                      )}
                      {showQuickAdjustment && (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={handleApplyQuickAdjustmentDraft}
                            className="min-h-[44px] rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
                            disabled={isSavingReceivable}
                          >
                            {editingQuickAdjustmentIndex !== null ? "Atualizar ajuste" : "Adicionar ajuste"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowQuickAdjustment(false);
                              setEditingQuickAdjustmentIndex(null);
                              setQuickAdjustmentType("discount");
                              setQuickAdjustmentAmount("");
                              setQuickAdjustmentNote("");
                            }}
                            className="min-h-[44px] rounded-md border border-border px-3 py-2 text-xs font-semibold"
                            disabled={isSavingReceivable}
                          >
                            Cancelar ajuste
                          </button>
                        </div>
                      )}
                      {Array.isArray(draftBalanceAdjustments) && draftBalanceAdjustments.length > 0 && (
                        <div className="space-y-2">
                          {draftBalanceAdjustments.map((adjustment, index) => (
                            <div key={`${adjustment.type}-${adjustment.amount}-${index}`} className="rounded-md border border-border/60 bg-background p-2">
                              <p className="text-xs text-foreground">
                                {adjustment.type === "discount" ? "Desconto" : "Acréscimo"} de {formatCurrency(adjustment.amount)}
                              </p>
                              <div className="mt-1 flex gap-2">
                                <button type="button" onClick={() => handleEditAdjustment(index)} className="min-h-[44px] rounded border border-border px-2 py-1 text-xs font-semibold">Editar</button>
                                <button type="button" onClick={() => handleDeleteAdjustment(index)} className="min-h-[44px] rounded border border-expense/30 px-2 py-1 text-xs font-semibold text-expense">Excluir</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {editingReceivableFreight?.status === "completed" && editReceivableUiPlan !== "undefined" && editReceivableUiPlan !== "paid_in_full" && (
                        <label className="space-y-1 text-sm text-foreground">
                          <span className="text-xs font-medium text-muted-foreground">Previsão do saldo</span>
                          <input
                            type="date"
                            value={editPaymentDueDate}
                            onChange={(e) => setEditPaymentDueDate(e.target.value)}
                            className="input-field"
                            disabled={isSavingReceivable}
                          />
                        </label>
                      )}

                      <label className="space-y-1 text-sm text-foreground">
                        <span className="text-xs font-medium text-muted-foreground">Lembrete de correio</span>
                        <div className="grid grid-cols-2 gap-2">
                          {([
                            { value: "off", label: "Sem lembrete" },
                            { value: "tomorrow", label: "Amanhã" },
                            { value: "day_after_tomorrow", label: "Depois de amanhã" },
                            { value: "pick_date", label: "Escolher dia" },
                          ] as const).map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => setEditMailReminderChoice(option.value)}
                              className={`min-h-[44px] rounded-lg border px-3 py-2 text-xs font-medium ${
                                editMailReminderChoice === option.value
                                  ? "border-primary bg-primary/10 text-foreground"
                                  : "border-border/70 text-muted-foreground hover:bg-secondary/40"
                              }`}
                              disabled={isSavingReceivable}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                        {editMailReminderChoice === "pick_date" && (
                          <input
                            type="date"
                            value={editMailReminderDate}
                            onChange={(e) => setEditMailReminderDate(e.target.value)}
                            className="input-field"
                            disabled={isSavingReceivable}
                          />
                        )}
                      </label>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="min-h-[44px] rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60"
                          onClick={handleSaveReceivable}
                          disabled={isSavingReceivable}
                        >
                          {isSavingReceivable ? "Salvando..." : "Salvar recebimento"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingReceivableFreight(null)}
                          className="min-h-[44px] rounded-md border border-border px-3 py-2 text-xs font-semibold"
                          disabled={isSavingReceivable}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

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
              {receivableEnabled && !isReceivableExpanded && (
                <>
                  {canSettleRemaining && (
                    <button
                      onClick={() => void handleMarkRemainingAsPaid(f)}
                      disabled={isSettlingBalance}
                      className="inline-flex min-h-[44px] items-center gap-1 rounded-md bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-60"
                    >
                      {isSettlingBalance ? "Quitando..." : "Recebi o saldo"}
                    </button>
                  )}
                </>
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
        open={isModeChooserOpen}
        onOpenChange={(open) => {
          if (open || isSavingMode) return;
          setIsModeChooserOpen(false);
          setPostCreateFreightId(null);
          setPostCreateModeFreight(null);
          setSelectedModeChoice(null);
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
            {([
              {
                value: "off",
                label: "Não usar",
                description: "Deixa o frete limpo, sem controle de recebimento.",
              },
              {
                value: "basic",
                label: "Básico",
                description: "Ativa recebimento sem burocracia. Você define a forma de recebimento depois.",
              },
              {
                value: "complete",
                label: "Completo",
                description: "Ativa recebimento completo. Forma de recebimento e pós-entrega ficam configuráveis depois.",
              },
            ] as const).map((option) => {
              const isSelected = selectedModeChoice === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  disabled={isSavingMode}
                  onClick={() => void handleSelectReceivableMode(option.value)}
                  className={`min-h-[44px] rounded-lg border px-3 py-2 text-left text-sm font-semibold transition-all ${
                    isSelected
                      ? "border-primary bg-primary/10 shadow-sm"
                      : "border-border/70 hover:border-primary/40 hover:bg-secondary/30"
                  }`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span>{option.label}</span>
                    <span
                      className={`inline-flex h-5 w-5 items-center justify-center rounded-full border ${
                        isSelected ? "border-primary bg-primary text-primary-foreground" : "border-border text-transparent"
                      }`}
                    >
                      <FontAwesomeIcon icon={iconCheck} className="h-3 w-3" />
                    </span>
                  </span>
                  <span className="mt-1 block text-xs font-normal text-muted-foreground">
                    {option.description}
                  </span>
                </button>
              );
            })}
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
            <DialogTitle>Pós-entrega do recebimento</DialogTitle>
            <DialogDescription>
              Agora você pode registrar previsão, canhoto e ajustes do saldo deste frete.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <label className="space-y-1 text-sm text-foreground">
              <span className="text-xs font-medium text-muted-foreground">Data prevista para recebimento do saldo</span>
              <input type="date" value={completionForecastDate} onChange={(e) => setCompletionForecastDate(e.target.value)} className="input-field" />
            </label>

            <label className="space-y-1 text-sm text-foreground">
              <span className="text-xs font-medium text-muted-foreground">Canhoto para liberar saldo</span>
              <div className="grid grid-cols-1 gap-2">
                {([
                  { value: "none", label: "Canhoto: não precisa" },
                  { value: "proof_photo", label: "Canhoto: enviar foto" },
                  { value: "physical_proof", label: "Canhoto: enviar físico" },
                ] as const).map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setCompletionBalanceReleaseMode(option.value)}
                    className={`min-h-[44px] rounded-lg border px-3 py-2 text-left text-sm ${
                      completionBalanceReleaseMode === option.value
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border/70 text-muted-foreground hover:bg-secondary/40"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </label>

            {completionBalanceReleaseMode === "physical_proof" && (
              <label className="space-y-1 text-sm text-foreground">
                <span className="text-xs font-medium text-muted-foreground">Lembrete de correio (opcional)</span>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { value: "off", label: "Não lembrar" },
                    { value: "tomorrow", label: "Amanhã" },
                    { value: "day_after_tomorrow", label: "Depois de amanhã" },
                    { value: "pick_date", label: "Escolher dia" },
                  ] as const).map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setCompletionMailReminder(option.value)}
                      className={`min-h-[44px] rounded-lg border px-3 py-2 text-xs font-medium ${
                        completionMailReminder === option.value
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border/70 text-muted-foreground hover:bg-secondary/40"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                {completionMailReminder === "pick_date" && (
                  <input
                    type="date"
                    value={completionMailReminderDate}
                    onChange={(e) => setCompletionMailReminderDate(e.target.value)}
                    className="input-field"
                  />
                )}
                <p className="text-[11px] text-muted-foreground">Esse lembrete fica salvo localmente neste dispositivo e pode ser revisado no painel de recebimento.</p>
              </label>
            )}

            <QuickBalanceAdjustmentSection
              expanded={completionShowQuickAdjustment}
              onExpand={() => setCompletionShowQuickAdjustment(true)}
              adjustmentType={completionQuickAdjustmentType}
              onChangeType={setCompletionQuickAdjustmentType}
              adjustmentAmount={completionQuickAdjustmentAmount}
              onChangeAmount={setCompletionQuickAdjustmentAmount}
              adjustmentNote={completionQuickAdjustmentNote}
              onChangeNote={setCompletionQuickAdjustmentNote}
            />
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <button type="button" onClick={handleSaveCompletionForecast} disabled={isSavingCompletionForecast} className="w-full min-h-[44px] rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
              Salvar etapa pós-entrega
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
