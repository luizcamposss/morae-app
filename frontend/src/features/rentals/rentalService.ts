import { apiRequest } from "../../shared/lib/api/apiClient";

// 1 IPCA, 2 IGP-M, 3 agreed value, 4 none.
export type RentAdjustmentIndex = 1 | 2 | 3 | 4;

export const RENTAL_STATUS = { active: 1, ended: 2 } as const;

export const adjustmentOptions: Array<{ value: RentAdjustmentIndex; label: string }> = [
  { value: 1, label: "IPCA" },
  { value: 2, label: "IGP-M" },
  { value: 3, label: "Valor combinado" },
  { value: 4, label: "Sem reajuste" },
];

export type RentalContract = {
  id: number;
  condominiumId: number;
  unitId: number;
  unitNumber: string;
  buildingName: string;
  tenantPersonId: number;
  tenantName: string;
  monthlyRent: number;
  dueDay: number;
  startDate: string;
  endDate: string | null;
  includesWater: boolean;
  includesElectricity: boolean;
  includesGas: boolean;
  includesCondominiumFee: boolean;
  condominiumFeeAmount: number | null;
  adjustmentIndex: RentAdjustmentIndex;
  nextAdjustmentDate: string | null;
  status: number;
  lastBilledMonth: string | null;
  endReason: string | null;
  valueChanges: Array<{ previousValue: number | null; newValue: number; effectiveFrom: string; createdAt: string }>;
};

export type SaveRentalContractRequest = {
  unitId: number;
  tenantPersonId: number;
  monthlyRent: number;
  dueDay: number;
  startDate: string;
  endDate: string | null;
  includesWater: boolean;
  includesElectricity: boolean;
  includesGas: boolean;
  includesCondominiumFee: boolean;
  condominiumFeeAmount: number | null;
  adjustmentIndex: RentAdjustmentIndex;
  nextAdjustmentDate: string | null;
};

export function adjustmentLabel(index: RentAdjustmentIndex) {
  return adjustmentOptions.find((option) => option.value === index)?.label ?? "Sem reajuste";
}

// "Aluguel + água + luz" — what the tenant's monthly bill brings.
export function describeIncludes(contract: Pick<RentalContract, "includesWater" | "includesElectricity" | "includesGas" | "includesCondominiumFee">) {
  const parts = ["aluguel"];
  if (contract.includesCondominiumFee) parts.push("condomínio");
  if (contract.includesWater) parts.push("água");
  if (contract.includesElectricity) parts.push("luz");
  if (contract.includesGas) parts.push("gás");
  return parts.join(" + ").replace(/^./, (first) => first.toUpperCase());
}

export function getRentalContracts(condominiumId: number) {
  return apiRequest<RentalContract[]>(`/api/condominiums/${condominiumId}/rental-contracts`, { auth: true });
}

export function getMyRentalContracts() {
  return apiRequest<RentalContract[]>("/api/my/rental-contracts", { auth: true });
}

export function createRentalContract(condominiumId: number, data: SaveRentalContractRequest) {
  return apiRequest<RentalContract>(`/api/condominiums/${condominiumId}/rental-contracts`, { method: "POST", body: data, auth: true });
}

export function updateRentalContract(id: number, data: SaveRentalContractRequest) {
  return apiRequest<RentalContract>(`/api/rental-contracts/${id}`, { method: "PUT", body: data, auth: true });
}

export function adjustRent(id: number, newValue: number) {
  return apiRequest<RentalContract>(`/api/rental-contracts/${id}/adjust`, { method: "POST", body: { newValue }, auth: true });
}

export function endRentalContract(id: number, endDate: string, reason: string) {
  return apiRequest<RentalContract>(`/api/rental-contracts/${id}/end`, { method: "POST", body: { endDate, reason: reason || null }, auth: true });
}
