import { Freight } from "@/types";

export type FreightReceivableStatus = "received" | "partial" | "overdue" | "pending";

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

export function getFreightRemainingBalance(freight: Pick<Freight, "grossValue" | "amountReceived">): number {
  const grossValue = normalizeAmount(freight.grossValue);
  const amountReceived = normalizeAmount(freight.amountReceived);

  return Math.max(0, grossValue - amountReceived);
}

export function getFreightReceivedPercentage(freight: Pick<Freight, "grossValue" | "amountReceived">): number {
  const grossValue = normalizeAmount(freight.grossValue);
  if (grossValue <= 0) return 0;

  const amountReceived = normalizeAmount(freight.amountReceived);
  return Math.min(100, (amountReceived / grossValue) * 100);
}

export function isFreightOverdue(
  freight: Pick<Freight, "grossValue" | "amountReceived" | "paymentDueDate">,
  referenceDate = new Date(),
): boolean {
  if (getFreightRemainingBalance(freight) <= 0) return false;

  const dueMs = getDueDateTimestamp(freight.paymentDueDate);
  if (dueMs === null) return false;

  return referenceDate.getTime() > dueMs;
}

export function getFreightReceivableStatus(
  freight: Pick<Freight, "grossValue" | "amountReceived" | "paymentDueDate">,
  referenceDate = new Date(),
): FreightReceivableStatus {
  const grossValue = normalizeAmount(freight.grossValue);
  const amountReceived = normalizeAmount(freight.amountReceived);

  if (amountReceived >= grossValue) return "received";
  if (isFreightOverdue(freight, referenceDate)) return "overdue";
  if (amountReceived > 0 && amountReceived < grossValue) return "partial";
  return "pending";
}
