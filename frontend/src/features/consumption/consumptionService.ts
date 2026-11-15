import { apiRequest } from "../../shared/lib/api/apiClient";

// 3 water, 4 electricity, 5 gas (same values as ChargeCategory).
export type Utility = 3 | 4 | 5;

export const UTILITIES: Array<{ value: Utility; label: string; unit: string }> = [
  { value: 3, label: "Água", unit: "m³" },
  { value: 4, label: "Luz", unit: "kWh" },
  { value: 5, label: "Gás", unit: "m³" },
];

export const utilityInfo = (value: Utility) => UTILITIES.find((utility) => utility.value === value) ?? UTILITIES[0];

export type UtilityRate = { category: Utility; enabled: boolean; pricePerUnit: number; minimumCharge: number };

export type ReadingRow = {
  unitId: number;
  unitNumber: string;
  buildingName: string;
  payerPersonId: number | null;
  payerName: string | null;
  previousReading: number | null;
  currentReading: number | null;
  consumption: number | null;
  amount: number | null;
  averageConsumption: number | null;
  isLocked: boolean;
};

export type ReadingMonth = { month: string; category: Utility; rate: UtilityRate | null; rows: ReadingRow[] };

export type ConsumptionHistory = {
  unitId: number;
  unitLabel: string;
  category: Utility;
  months: Array<{ month: string; consumption: number; amount: number }>;
};

export function getUtilityRates(condominiumId: number) {
  return apiRequest<UtilityRate[]>(`/api/condominiums/${condominiumId}/utility-rates`, { auth: true });
}

export function saveUtilityRates(condominiumId: number, rates: UtilityRate[]) {
  return apiRequest<UtilityRate[]>(`/api/condominiums/${condominiumId}/utility-rates`, { method: "PUT", body: { rates }, auth: true });
}

export function getReadingMonth(condominiumId: number, month: string, category: Utility) {
  return apiRequest<ReadingMonth>(`/api/condominiums/${condominiumId}/readings?month=${month}&category=${category}`, { auth: true });
}

export function saveReadings(
  condominiumId: number,
  month: string,
  category: Utility,
  readings: Array<{ unitId: number; currentReading: number; previousReading: number | null }>,
) {
  return apiRequest<{ saved: number; total: number }>(`/api/condominiums/${condominiumId}/readings`, {
    method: "POST",
    body: { month, category, readings },
    auth: true,
  });
}

export function getMyConsumption() {
  return apiRequest<ConsumptionHistory[]>("/api/my/consumption", { auth: true });
}

// "18,5" → 18.5; empty → null.
export function parseReading(value: string) {
  const text = value.trim();
  if (!text) return null;
  const number = Number(text.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(number) ? number : Number.NaN;
}

export function formatReading(value: number | null | undefined) {
  return value == null ? "" : value.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
}
