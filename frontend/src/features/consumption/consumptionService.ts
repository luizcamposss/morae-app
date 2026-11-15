import { apiRequest } from "../../shared/lib/api/apiClient";

// 3 water, 4 electricity, 5 gas (same values as ChargeCategory).
export type Utility = 3 | 4 | 5;

export const UTILITIES: Array<{ value: Utility; label: string }> = [
  { value: 3, label: "Água" },
  { value: 4, label: "Luz" },
  { value: 5, label: "Gás" },
];

export const utilityLabel = (value: Utility) => UTILITIES.find((utility) => utility.value === value)?.label ?? "Água";

export type UtilityRow = {
  unitId: number;
  unitNumber: string;
  buildingName: string;
  // Who pays the unit's condominium bills this month (tenant or owners).
  payerName: string | null;
  amounts: Array<{ category: Utility; amount: number; isLocked: boolean }>;
};

export type UtilityMonth = { month: string; utilities: Utility[]; rows: UtilityRow[] };

export type ConsumptionHistory = {
  unitId: number;
  unitLabel: string;
  category: Utility;
  months: Array<{ month: string; amount: number }>;
};

export function getUtilityMonth(condominiumId: number, month: string) {
  return apiRequest<UtilityMonth>(`/api/condominiums/${condominiumId}/utilities?month=${month}`, { auth: true });
}

export function saveUtilityMonth(condominiumId: number, month: string, amounts: Array<{ unitId: number; category: Utility; amount: number | null }>) {
  return apiRequest<{ saved: number; total: number }>(`/api/condominiums/${condominiumId}/utilities`, {
    method: "POST",
    body: { month, amounts },
    auth: true,
  });
}

export function saveUtilitySettings(condominiumId: number, utilities: Utility[]) {
  return apiRequest<{ utilities: Utility[] }>(`/api/condominiums/${condominiumId}/utilities/settings`, {
    method: "PUT",
    body: { utilities },
    auth: true,
  });
}

export function getMyConsumption() {
  return apiRequest<ConsumptionHistory[]>("/api/my/consumption", { auth: true });
}
