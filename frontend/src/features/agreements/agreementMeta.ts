import { CHARGE_STATUS } from "../charges/platformRevenue";
import type { AgreementInstallment, AgreementResponse, AgreementStatus } from "./types";

export const AGREEMENT_STATUS = { active: 1, completed: 2, broken: 3, canceled: 4 } as const;

export const agreementStatuses: Record<AgreementStatus, { label: string; tone: string }> = {
  1: { label: "Ativo", tone: "bg-verde-suave text-verde-tinta" },
  2: { label: "Quitado", tone: "bg-tinta text-white" },
  3: { label: "Quebrado", tone: "bg-vermelho-suave text-vermelho" },
  4: { label: "Cancelado", tone: "bg-campo text-tinta-suave" },
};

export function installmentLabel(installment: Pick<AgreementInstallment, "number">, count: number) {
  return installment.number === 0 ? "Entrada" : `Parcela ${installment.number} de ${count}`;
}

// The next installment to pay (overdue first, then the oldest due date).
export function nextInstallment(agreement: AgreementResponse) {
  return agreement.installments
    .filter((item) => item.status === CHARGE_STATUS.pending || item.status === CHARGE_STATUS.overdue)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
}

export function progressPercent(agreement: Pick<AgreementResponse, "paidCount" | "totalCount">) {
  return agreement.totalCount ? Math.round((agreement.paidCount / agreement.totalCount) * 100) : 0;
}
