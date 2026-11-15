import { apiRequest } from "../../shared/lib/api/apiClient";

// The condominium fee of every month (#211).
export type CondominiumFee = {
  enabled: boolean;
  amount: number;
  dueDay: number;
  exceptions: Array<{ unitId: number; unitLabel: string; amount: number }>;
};

export function getCondominiumFee(condominiumId: number) {
  return apiRequest<CondominiumFee>(`/api/condominiums/${condominiumId}/condominium-fee`, { auth: true });
}

export function describeFee(fee: CondominiumFee) {
  if (!fee.enabled) return "Não cobra";
  const value = fee.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const extra = fee.exceptions.length ? ` · ${fee.exceptions.length} ${fee.exceptions.length === 1 ? "exceção" : "exceções"}` : "";
  return `${value} por unidade · vence dia ${fee.dueDay}${extra}`;
}
