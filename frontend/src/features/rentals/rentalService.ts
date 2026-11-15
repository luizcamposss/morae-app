import { apiRequest } from "../../shared/lib/api/apiClient";
import type { ChargeResponse } from "../charges/types";

// 1 the tenant, 2 the owner: who pays the unit's condominium bills while rented.
export type CondominiumBillsPayer = 1 | 2;

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
  condominiumBillsPaidBy: CondominiumBillsPayer;
  adjustmentIndex: RentAdjustmentIndex;
  nextAdjustmentDate: string | null;
  status: number;
  lastBilledMonth: string | null;
  endReason: string | null;
  valueChanges: Array<{ previousValue: number | null; newValue: number; effectiveFrom: string; createdAt: string }>;
  // A unit owner's own contract: the management sees it without values and can't change it.
  isOwnerContract: boolean;
  ownerName: string | null;
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
  condominiumBillsPaidBy: CondominiumBillsPayer;
  adjustmentIndex: RentAdjustmentIndex;
  nextAdjustmentDate: string | null;
};

export function adjustmentLabel(index: RentAdjustmentIndex) {
  return adjustmentOptions.find((option) => option.value === index)?.label ?? "Sem reajuste";
}

// "Inquilino paga o condomínio" — who pays the unit's condominium bills while rented.
export function describeIncludes(contract: Pick<RentalContract, "condominiumBillsPaidBy">) {
  return contract.condominiumBillsPaidBy === 2 ? "Proprietário paga o condomínio" : "Inquilino paga o condomínio";
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

// Unit owner ("Meus aluguéis"): contracts of the units they own, paid into their own account.
export function getOwnedRentalContracts() {
  return apiRequest<RentalContract[]>("/api/my/owned-rental-contracts", { auth: true });
}

export function createOwnedRentalContract(data: SaveRentalContractRequest) {
  return apiRequest<RentalContract>("/api/my/owned-rental-contracts", { method: "POST", body: data, auth: true });
}

export function getRentReceivedAsOwner() {
  return apiRequest<ChargeResponse[]>("/api/charges/received-as-owner", { auth: true });
}

// The rent inside a bill: its rent items, or the whole charge when it is a rent charge.
export function rentOf(charge: ChargeResponse) {
  if (charge.items?.length) return charge.items.filter((item) => item.category === 2).reduce((total, item) => total + item.amount, 0);
  return charge.category === 2 ? charge.value : 0;
}
