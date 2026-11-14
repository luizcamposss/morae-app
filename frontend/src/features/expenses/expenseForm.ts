import { todayInputDate } from "../../shared/lib/date";
import { isValidInputDate, parseCurrencyInput } from "../adminPayments/chargeForm";
import type { ExpenseResponse, SaveExpenseRequest } from "./types";

export type ExpenseForm = {
  categoryId: number | null;
  amount: string;
  paidOn: string;
  supplier: string;
  buildingId: string;
  description: string;
  file: File | null;
  removeReceipt: boolean;
};

export function initialExpenseForm(expense: ExpenseResponse | null): ExpenseForm {
  return {
    categoryId: expense?.categoryId ?? null,
    amount: expense ? expense.amount.toFixed(2).replace(".", ",") : "",
    paidOn: expense?.paidOn ?? todayInputDate(),
    supplier: expense?.supplier ?? "",
    buildingId: expense?.buildingId ? String(expense.buildingId) : "",
    description: expense?.description ?? "",
    file: null,
    removeReceipt: false,
  };
}

// First problem of the "Quanto e quando?" step, or "" when it can be saved.
export function validateExpenseForm(form: ExpenseForm) {
  const amount = parseCurrencyInput(form.amount);
  if (!form.categoryId) return "Escolha o que foi pago.";
  if (!form.amount.trim() || !Number.isFinite(amount) || amount <= 0) return "Informe o valor pago.";
  if (!isValidInputDate(form.paidOn)) return "Informe a data do pagamento.";
  if (form.paidOn > todayInputDate()) return "A data do pagamento não pode ser no futuro.";
  return "";
}

export function toSaveExpenseRequest(form: ExpenseForm): SaveExpenseRequest {
  return {
    categoryId: form.categoryId ?? 0,
    amount: Math.round(parseCurrencyInput(form.amount) * 100) / 100,
    paidOn: form.paidOn,
    supplier: form.supplier.trim(),
    buildingId: form.buildingId ? Number(form.buildingId) : null,
    description: form.description.trim(),
    file: form.file,
    removeReceipt: form.removeReceipt,
  };
}
