import { formatCurrency } from "../../shared/lib/currency";
import { todayInputDate } from "../../shared/lib/date";
import type { ChargeResponse } from "../charges/types";
import type { CondominiumResponse } from "../condominiums/types";
import type { PaymentMethod } from "../payments/types";

// Forms and validation of the platform subscriptions screen (moved from the old page as is).
export type CreateFormState = {
  condominiumId: string;
  description: string;
  value: string;
  dueDate: string;
};

export type PaymentFormState = {
  chargeId: number;
  amountPaid: string;
  paymentMethod: PaymentMethod;
  paidAt: string;
  notes: string;
};

export type CancelFormState = {
  chargeId: number;
  reason: string;
};

export const initialCreateForm: CreateFormState = {
  condominiumId: "",
  description: "",
  value: "",
  dueDate: "",
};

export const paymentMethodOptions: Array<{ value: PaymentMethod; label: string }> = [
  { value: 1, label: "Pix" },
  { value: 2, label: "Cartão de crédito" },
  { value: 3, label: "Cartão de débito" },
  { value: 4, label: "Boleto" },
];

// Manual payment pre-filled with the full value, today and Pix.
export function toPaymentForm(charge: ChargeResponse): PaymentFormState {
  return { chargeId: charge.id, amountPaid: charge.value.toString(), paymentMethod: 1, paidAt: todayInputDate(), notes: "" };
}

export function validateCreateForm(
  form: CreateFormState,
  condominiums: CondominiumResponse[],
) {
  const condominiumId = Number(form.condominiumId);
  const description = form.description.trim();
  const value = parseCurrencyInput(form.value);

  if (!form.condominiumId || Number.isNaN(condominiumId)) {
    return "Selecione um condomínio.";
  }

  if (!condominiums.some((condominium) => condominium.id === condominiumId)) {
    return "O condomínio selecionado não está disponível.";
  }

  if (!description) {
    return "Informe a descrição da cobrança.";
  }

  if (description.length < 3) {
    return "A descrição precisa ter pelo menos 3 caracteres.";
  }

  if (description.length > 255) {
    return "A descrição deve ter no máximo 255 caracteres.";
  }

  if (!form.value || !Number.isFinite(value) || value <= 0) {
    return "Informe um valor maior que zero.";
  }

  if (!Number.isInteger(value * 100)) {
    return "Informe o valor com no máximo duas casas decimais.";
  }

  if (!form.dueDate) {
    return "Informe a data de vencimento.";
  }

  if (!isValidInputDate(form.dueDate)) {
    return "Informe uma data de vencimento válida.";
  }

  if (form.dueDate < todayInputDate()) {
    return "O vencimento não pode ser anterior a hoje.";
  }

  return "";
}

export function validatePaymentForm(form: PaymentFormState, charge?: ChargeResponse) {
  const amountPaid = parseCurrencyInput(form.amountPaid);

  if (!charge) {
    return "Cobrança não encontrada para registrar a baixa.";
  }

  if (!form.amountPaid || !Number.isFinite(amountPaid) || amountPaid <= 0) {
    return "Informe um valor pago maior que zero.";
  }

  if (!Number.isInteger(amountPaid * 100)) {
    return "Informe o valor pago com no máximo duas casas decimais.";
  }

  if (toCents(amountPaid) !== toCents(charge.value)) {
    return `O valor pago precisa ser igual ao valor da cobrança (${formatCurrency(charge.value)}).`;
  }

  if (form.paymentMethod === 0) {
    return "Selecione o método de pagamento.";
  }

  if (!form.paidAt) {
    return "Informe a data do pagamento.";
  }

  if (!isValidInputDate(form.paidAt)) {
    return "Informe uma data de pagamento válida.";
  }

  if (form.paidAt > todayInputDate()) {
    return "A data do pagamento não pode ser futura.";
  }

  if (form.notes.trim().length > 255) {
    return "A observação deve ter no máximo 255 caracteres.";
  }

  return "";
}

export function validateCancelForm(form: CancelFormState) {
  const reason = form.reason.trim();

  if (!reason) {
    return "Informe o motivo do cancelamento.";
  }

  if (reason.length < 5) {
    return "O motivo precisa ter pelo menos 5 caracteres.";
  }

  if (reason.length > 255) {
    return "O motivo deve ter no máximo 255 caracteres.";
  }

  return "";
}

export function toCents(value: number) {
  return Math.round(value * 100);
}

export function parseCurrencyInput(value: string) {
  return Number(value.trim().replace(/\./g, "").replace(",", "."));
}

export function isValidInputDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00`);

  return !Number.isNaN(date.getTime());
}
