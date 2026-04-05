import { AppData } from "@/types";

const STORAGE_KEY = "space-truck-data";
const LEGACY_STORAGE_KEY = "estrada-real-data";

/**
 * Migrates data from the legacy storage key to the current key if needed.
 * Safe to call multiple times — a no-op once migration is done.
 */
function migrateLegacyStorage(): void {
  try {
    if (localStorage.getItem(STORAGE_KEY) === null) {
      const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacy !== null) {
        localStorage.setItem(STORAGE_KEY, legacy);
        localStorage.removeItem(LEGACY_STORAGE_KEY);
      }
    }
  } catch {
    // localStorage may be unavailable — migration is best-effort
  }
}

export function loadData(): AppData {
  migrateLegacyStorage();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // localStorage may be unavailable or contain invalid JSON
  }
  return { vehicles: [], trips: [], maintenanceServices: [] };
}

export function saveData(data: AppData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
