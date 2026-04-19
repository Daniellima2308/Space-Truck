import { Freight } from "@/types";

export type FreightReceivableStatus = "received" | "partial" | "overdue" | "pending";
export type FreightReceivableBadgeState =
  | "undefined"
  | "after_delivery"
  | "awaiting_balance"
  | "awaiting_proof"
  | "due_today"
  | "overdue"
  | "received";
export type FreightPaymentForecastState =
  | "no_forecast"
  | "on_track"
  | "approaching"
  | "due_today"
  | "overdue"
  | "settled";

function normalizeAmount(value: number | null | undefined): number {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  return Math.max(0, value);
}

function getDueDateTimestamp(paymentDueDate?: string): number | null {
  if (!paymentDueDate) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(paymentDueDate)) return null;

  const [yearRaw, monthRaw, dayRaw] = paymentDueDate.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return null;
  }

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  const dueDate = new Date(year, month - 1, day, 23, 59, 59, 999);
  if (
    dueDate.getFullYear() !== year ||
    dueDate.getMonth() !== month - 1 ||
    dueDate.getDate() !== day
  ) {
    return null;
  }

  const dueMs = dueDate.getTime();
  if (Number.isNaN(dueMs)) return null;
  return dueMs;
}

export function getFreightRemainingBalance(
  freight: Pick<Freight, "grossValue" | "amountReceived" | "advanceAmount" | "receivablePlanType" | "balanceAdjustments">,
): number {
  if (freight.receivablePlanType === "undefined") {
    return 0;
  }
  const target = getFreightReceivableTarget(freight);
  const amountReceived = getFreightTotalReceived(freight);
  return Math.max(0, target - amountReceived);
}

export function getFreightAdvanceReceived(
  freight: Pick<Freight, "advanceAmount">,
): number {
  return normalizeAmount(freight.advanceAmount);
}

export function getFreightPlannedBalance(
  freight: Pick<Freight, "grossValue" | "advanceAmount" | "receivablePlanType">,
): number {
  if (freight.receivablePlanType === "undefined") {
    return 0;
  }
  if (freight.receivablePlanType === "paid_in_full") {
    return 0;
  }
  if (freight.receivablePlanType === "paid_on_delivery") {
    return normalizeAmount(freight.grossValue);
  }
  const grossValue = normalizeAmount(freight.grossValue);
  const advanceAmount = getFreightAdvanceReceived(freight);
  return Math.max(0, grossValue - advanceAmount);
}

export function getFreightAdjustmentsNet(
  freight: Pick<Freight, "balanceAdjustments">,
): number {
  const adjustments = Array.isArray(freight.balanceAdjustments)
    ? freight.balanceAdjustments
    : [];

  return adjustments.reduce((acc, adjustment) => {
    const amount = normalizeAmount(adjustment?.amount);
    if (adjustment?.type === "discount") return acc - amount;
    if (adjustment?.type === "increase") return acc + amount;
    return acc;
  }, 0);
}

export function getFreightAdjustedBalance(
  freight: Pick<Freight, "grossValue" | "advanceAmount" | "balanceAdjustments" | "receivablePlanType">,
): number {
  const plannedBalance = getFreightPlannedBalance(freight);
  const net = getFreightAdjustmentsNet(freight);
  return Math.max(0, plannedBalance + net);
}

export function getFreightReceivableTarget(
  freight: Pick<Freight, "grossValue" | "balanceAdjustments" | "receivablePlanType">,
): number {
  if (freight.receivablePlanType === "undefined") {
    return 0;
  }
  const grossValue = normalizeAmount(freight.grossValue);
  const net = getFreightAdjustmentsNet(freight);
  return Math.max(0, grossValue + net);
}

export function getFreightTotalReceived(
  freight: Pick<
    Freight,
    "amountReceived" | "advanceAmount" | "receivablePlanType" | "grossValue" | "balanceAdjustments"
  >,
): number {
  const amountReceived = normalizeAmount(freight.amountReceived);
  const advanceAmount = normalizeAmount(freight.advanceAmount);
  const planType = freight.receivablePlanType ?? "undefined";

  if (planType === "undefined") return 0;
  if (planType === "paid_in_full") {
    return getFreightReceivableTarget(freight);
  }
  if (planType === "advance_value" || planType === "advance_percent") {
    return Math.max(amountReceived, advanceAmount);
  }
  return amountReceived;
}

export function getFreightAmountReceivedForSettlement(
  freight: Pick<
    Freight,
    "amountReceived" | "advanceAmount" | "receivablePlanType" | "grossValue" | "balanceAdjustments"
  >,
): number {
  const currentAmountReceived = normalizeAmount(freight.amountReceived);
  const target = getFreightReceivableTarget(freight);
  const totalReceived = getFreightTotalReceived(freight);
  if (target <= totalReceived) return currentAmountReceived;
  return Math.max(currentAmountReceived, target);
}

export function isFreightLockedByProof(
  freight: Pick<Freight, "deliveryProofStatus" | "balanceReleaseMode">,
): boolean {
  if (!freight.balanceReleaseMode || freight.balanceReleaseMode === "none") return false;
  if (freight.balanceReleaseMode === "direct_delivery") return false;
  if (freight.deliveryProofStatus === "not_required") return false;
  return freight.deliveryProofStatus !== "confirmed";
}

export function isFreightSettled(
  freight: Pick<Freight, "grossValue" | "amountReceived" | "advanceAmount" | "balanceAdjustments" | "receivablePlanType">,
): boolean {
  const target = getFreightReceivableTarget(freight);
  if (target <= 0) return true;
  return getFreightTotalReceived(freight) >= target;
}

export function getFreightReceivedPercentage(
  freight: Pick<Freight, "grossValue" | "amountReceived" | "advanceAmount" | "receivablePlanType" | "balanceAdjustments">,
): number {
  const target = getFreightReceivableTarget(freight);
  if (target <= 0) return 0;

  const amountReceived = getFreightTotalReceived(freight);
  return Math.min(100, (amountReceived / target) * 100);
}

export function isFreightOverdue(
  freight: Pick<Freight, "grossValue" | "amountReceived" | "advanceAmount" | "paymentDueDate" | "balanceAdjustments" | "receivablePlanType">,
  referenceDate = new Date(),
): boolean {
  if (isFreightSettled(freight)) return false;

  const dueMs = getDueDateTimestamp(freight.paymentDueDate);
  if (dueMs === null) return false;

  return referenceDate.getTime() > dueMs;
}

export function getFreightReceivableStatus(
  freight: Pick<
    Freight,
    | "grossValue"
    | "amountReceived"
    | "paymentDueDate"
    | "deliveryProofStatus"
    | "balanceReleaseMode"
    | "balanceAdjustments"
    | "receivablePlanType"
  >,
  referenceDate = new Date(),
): FreightReceivableStatus {
  if (freight.receivablePlanType === "undefined") {
    return "pending";
  }
  const target = getFreightReceivableTarget(freight);
  const amountReceived = getFreightTotalReceived(freight);

  if (amountReceived >= target) return "received";
  if (isFreightLockedByProof(freight)) return "pending";
  if (isFreightOverdue(freight, referenceDate)) return "overdue";
  if (amountReceived > 0 && amountReceived < target) return "partial";
  return "pending";
}

function isDueToday(paymentDueDate: string | undefined, referenceDate: Date): boolean {
  const dueMs = getDueDateTimestamp(paymentDueDate);
  if (dueMs === null) return false;
  const dueDate = new Date(dueMs);
  return (
    dueDate.getFullYear() === referenceDate.getFullYear() &&
    dueDate.getMonth() === referenceDate.getMonth() &&
    dueDate.getDate() === referenceDate.getDate()
  );
}

export function getFreightReceivableBadgeState(
  freight: Pick<
    Freight,
    | "grossValue"
    | "amountReceived"
    | "advanceAmount"
    | "paymentDueDate"
    | "deliveryProofStatus"
    | "balanceReleaseMode"
    | "balanceAdjustments"
    | "receivablePlanType"
    | "status"
  >,
  referenceDate = new Date(),
): FreightReceivableBadgeState {
  const planType = freight.receivablePlanType ?? "undefined";
  if (planType === "undefined") return "undefined";
  if (planType === "paid_on_delivery" && freight.status !== "completed") {
    return "after_delivery";
  }
  if (isFreightSettled(freight)) return "received";
  if (isFreightLockedByProof(freight)) return "awaiting_proof";
  if (isFreightOverdue(freight, referenceDate)) return "overdue";
  if (isDueToday(freight.paymentDueDate, referenceDate)) return "due_today";
  return "awaiting_balance";
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function getFreightPaymentForecastState(
  freight: Pick<Freight, "grossValue" | "amountReceived" | "advanceAmount" | "paymentDueDate" | "balanceAdjustments" | "receivablePlanType">,
  referenceDate = new Date(),
): FreightPaymentForecastState {
  if (isFreightSettled(freight)) return "settled";
  const dueMs = getDueDateTimestamp(freight.paymentDueDate);
  if (dueMs === null) return "no_forecast";

  const dueDate = new Date(dueMs);
  const refStart = startOfDay(referenceDate).getTime();
  const dueStart = startOfDay(dueDate).getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  const diffDays = Math.round((dueStart - refStart) / dayMs);

  if (diffDays < 0) return "overdue";
  if (diffDays === 0) return "due_today";
  if (diffDays === 1) return "approaching";
  return "on_track";
}
