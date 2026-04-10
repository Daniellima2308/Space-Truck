import { Trip } from "@/types";
import {
  getFinalizedFreights,
  getTripActualKmTotal,
  getTripKmBasisToDate,
  getTripKmBasisTotal,
} from "@/domain/operation";

export {
  getOperationalFreights,
  getPlannedFreights,
  getTripFreightEstimatedKmTotal,
  getTripGrossRevenue,
  getTripGrossRevenueToDate,
  getTripTotalCommissions,
  getTripTotalCommissionsToDate,
  getTripTotalExpenses,
  getTripTotalPersonalExpenses,
  getTripNetRevenue,
  getTripNetRevenueToDate,
  getTripActualKmToDate,
  getTripActualKmTotal,
  getTripLatestCheckpointKm,
  getTripAverageConsumption,
  getTripEstimatedKmToDate,
  getTripKmBasisToDate,
  getTripEstimatedKmTotal,
  getTripFinalDistanceSnapshot,
  getTripKmBasisTotal,
  getTripCostPerKm,
  getTripCostPerKmToDate,
  getTripProfitPerKm,
  getTripProfitPerKmToDate,
} from "@/domain/operation";

export function getTripTotalKm(trip: Trip): number {
  return getTripActualKmTotal(trip);
}

export function getEffectiveKm(trip: Trip): { km: number; isEstimate: boolean } {
  const basis = trip.status === "open" ? getTripKmBasisToDate(trip) : getTripKmBasisTotal(trip);
  return { km: basis.km, isEstimate: basis.source === "estimated" };
}

export function getLastDestination(trip: Trip): string {
  const finalizedFreights = getFinalizedFreights(trip);
  if (finalizedFreights.length === 0) return "—";
  return finalizedFreights[finalizedFreights.length - 1].destination;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(value);
}

export function formatDate(date: string): string {
  const parsedDate = parseDateLikeInput(date);
  if (!parsedDate) return "—";
  return parsedDate.toLocaleDateString("pt-BR");
}

function parseDateLikeInput(value: string): Date | null {
  const normalizedValue = value.trim();
  if (!normalizedValue) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalizedValue)) {
    const [yearRaw, monthRaw, dayRaw] = normalizedValue.split("-");
    const year = Number(yearRaw);
    const month = Number(monthRaw);
    const day = Number(dayRaw);
    const localDate = new Date(year, month - 1, day);

    if (
      localDate.getFullYear() !== year ||
      localDate.getMonth() !== month - 1 ||
      localDate.getDate() !== day
    ) {
      return null;
    }

    return localDate;
  }

  const strictIsoDateTimeMatch = normalizedValue.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/,
  );
  if (!strictIsoDateTimeMatch) return null;

  const [
    ,
    yearRaw,
    monthRaw,
    dayRaw,
    hourRaw,
    minuteRaw,
    secondRaw = "00",
    fractionalRaw = "",
    timezoneRaw,
  ] = strictIsoDateTimeMatch;

  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  const second = Number(secondRaw);
  const millisecond = fractionalRaw
    ? Number(fractionalRaw.slice(1).padEnd(3, "0"))
    : 0;

  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour > 23 ||
    minute > 59 ||
    second > 59
  ) {
    return null;
  }

  const utcTime = Date.UTC(year, month - 1, day, hour, minute, second, millisecond);
  const utcDate = new Date(utcTime);

  if (
    utcDate.getUTCFullYear() !== year ||
    utcDate.getUTCMonth() !== month - 1 ||
    utcDate.getUTCDate() !== day ||
    utcDate.getUTCHours() !== hour ||
    utcDate.getUTCMinutes() !== minute ||
    utcDate.getUTCSeconds() !== second ||
    utcDate.getUTCMilliseconds() !== millisecond
  ) {
    return null;
  }

  if (timezoneRaw === "Z") {
    return utcDate;
  }

  const timezoneSign = timezoneRaw.startsWith("-") ? -1 : 1;
  const [offsetHoursRaw, offsetMinutesRaw] = timezoneRaw.slice(1).split(":");
  const offsetHours = Number(offsetHoursRaw);
  const offsetMinutes = Number(offsetMinutesRaw);

  if (offsetHours > 23 || offsetMinutes > 59) return null;

  const offsetInMinutes = timezoneSign * (offsetHours * 60 + offsetMinutes);
  return new Date(utcTime - offsetInMinutes * 60_000);
}
