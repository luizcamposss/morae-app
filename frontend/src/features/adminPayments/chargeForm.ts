import { formatCurrency } from "../../shared/lib/currency";
import { todayInputDate } from "../../shared/lib/date";
import { CHARGE_STATUS } from "../charges/platformRevenue";
import type { ChargeResponse, ChargeUnitValue, RecurringChargeStatus } from "../charges/types";
import { isValidInputDate, parseCurrencyInput, toCents } from "../masterPayments/platformChargeForm";
import type { PaymentMethod } from "../payments/types";
import type { UnitResponse } from "../units/types";

export { isValidInputDate, parseCurrencyInput, paymentMethodOptions, validateCancelForm, type CancelFormState } from "../masterPayments/platformChargeForm";

// Forms and helpers of the condominium charges screen (Admin).
export type SingleChargeForm = { unitId: string; value: string; dueDate: string; description: string };

// Batch (one month now) and recurring (every month) share the same form; only the date differs.
export type GroupChargeForm = {
  buildingId: string; // "" = every building
  value: string;
  dueDate: string; // batch only ("" = the condominium's due day)
  dueDay: string; // recurring only ("" = the condominium's due day)
  description: string;
  unitValues: Record<number, string>; // unitId → custom value ("" = the default value)
};

export type ManualPaymentForm = {
  chargeId: number;
  amountPaid: string;
  paymentMethod: PaymentMethod;
  paidAt: string;
  notes: string;
};

export const initialSingleForm: SingleChargeForm = { unitId: "", value: "", dueDate: "", description: "" };
export const initialGroupForm: GroupChargeForm = { buildingId: "", value: "", dueDate: "", dueDay: "", description: "", unitValues: {} };

export const recurringStatuses: Record<RecurringChargeStatus, { label: string; tone: "success" | "warning" | "neutral" }> = {
  1: { label: "Ativa", tone: "success" },
  2: { label: "Pausada", tone: "warning" },
  3: { label: "Encerrada", tone: "neutral" },
};

export function isOpenCharge(charge: Pick<ChargeResponse, "status">) {
  return charge.status === CHARGE_STATUS.pending || charge.status === CHARGE_STATUS.overdue;
}

export function hasLateFees(charge: Pick<ChargeResponse, "fineAmount" | "interestAmount">) {
  return charge.fineAmount > 0 || charge.interestAmount > 0;
}

// What the payer owes today: the updated amount for open charges, the value otherwise.
export function amountDue(charge: ChargeResponse) {
  return isOpenCharge(charge) ? charge.updatedAmount || charge.value : charge.value;
}

// Lowercase without accents, so "sindico" finds "Síndico".
export function normalizeSearch(value: string) {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

export function formatMoneyInput(value: number) {
  return value.toFixed(2).replace(".", ",");
}

export function unitLabel(unit: Pick<UnitResponse, "buildingName" | "number">) {
  return `${unit.buildingName} · ${unit.number}`;
}

const monthFormatter = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });

// "2026-10" → "outubro de 2026".
export function formatMonthKey(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return monthFormatter.format(new Date(Date.UTC(year, monthNumber - 1, 1)));
}

// Due months present in the list, newest first (filter options).
export function chargeMonths(charges: ChargeResponse[]) {
  return [...new Set(charges.map((charge) => charge.dueDate.slice(0, 7)))].sort((a, b) => b.localeCompare(a));
}

// Next date on the condominium's due day (the last day in short months), as the API does.
export function nextDueDate(dueDay: number) {
  const [year, month, day] = todayInputDate().split("-").map(Number);
  const build = (y: number, m: number) => {
    const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
    return `${y}-${String(m).padStart(2, "0")}-${String(Math.min(dueDay, lastDay)).padStart(2, "0")}`;
  };
  const thisMonth = build(year, month);
  return thisMonth.slice(8) >= String(day).padStart(2, "0") ? thisMonth : build(month === 12 ? year + 1 : year, month === 12 ? 1 : month + 1);
}

function validateMoney(raw: string, label: string) {
  const value = parseCurrencyInput(raw);
  if (!raw.trim() || !Number.isFinite(value) || value <= 0) return `Informe ${label} maior que zero.`;
  if (!Number.isInteger(Math.round(value * 1000) / 10)) return `Informe ${label} com no máximo duas casas decimais.`;
  return "";
}

function validateDescription(raw: string) {
  const description = raw.trim();
  if (description.length < 3) return "A descrição precisa ter pelo menos 3 caracteres.";
  if (description.length > 255) return "A descrição deve ter no máximo 255 caracteres.";
  return "";
}

export function validateSingleForm(form: SingleChargeForm) {
  if (!form.unitId) return "Escolha a unidade.";
  const money = validateMoney(form.value, "um valor");
  if (money) return money;
  if (!form.dueDate || !isValidInputDate(form.dueDate)) return "Informe uma data de vencimento válida.";
  if (form.dueDate < todayInputDate()) return "O vencimento não pode ser anterior a hoje.";
  return validateDescription(form.description);
}

export function validateGroupForm(form: GroupChargeForm, mode: "batch" | "recurring") {
  const money = validateMoney(form.value, "um valor");
  if (money) return money;
  if (mode === "batch" && form.dueDate) {
    if (!isValidInputDate(form.dueDate)) return "Informe uma data de vencimento válida.";
    if (form.dueDate < todayInputDate()) return "O vencimento não pode ser anterior a hoje.";
  }
  if (mode === "recurring" && form.dueDay) {
    const day = Number(form.dueDay);
    if (!Number.isInteger(day) || day < 1 || day > 31) return "O dia de vencimento vai de 1 a 31.";
  }
  const description = validateDescription(form.description);
  if (description) return description;
  for (const raw of Object.values(form.unitValues)) {
    if (raw.trim() && validateMoney(raw, "o valor da unidade")) return "Confira os valores ajustados: use valores maiores que zero, com até duas casas.";
  }
  return "";
}

// Only the units whose value differs from the default go to the API.
export function toUnitValues(form: GroupChargeForm, unitIds: number[]): ChargeUnitValue[] {
  const defaultCents = toCents(parseCurrencyInput(form.value));
  return unitIds
    .filter((unitId) => form.unitValues[unitId]?.trim())
    .map((unitId) => ({ unitId, value: parseCurrencyInput(form.unitValues[unitId]) }))
    .filter((item) => toCents(item.value) !== defaultCents);
}

export function toManualPaymentForm(charge: ChargeResponse): ManualPaymentForm {
  return { chargeId: charge.id, amountPaid: formatMoneyInput(amountDue(charge)), paymentMethod: 1, paidAt: todayInputDate(), notes: "" };
}

// The manager may waive fine/interest: anything from the original value up to today's updated amount.
export function validateManualPayment(form: ManualPaymentForm, charge?: ChargeResponse) {
  if (!charge) return "Cobrança não encontrada para registrar a baixa.";
  const money = validateMoney(form.amountPaid, "o valor pago");
  if (money) return money;
  const paid = toCents(parseCurrencyInput(form.amountPaid));
  const max = amountDue(charge);
  if (paid < toCents(charge.value) || paid > toCents(max)) {
    return toCents(max) === toCents(charge.value)
      ? `O valor pago precisa ser igual ao valor da cobrança (${formatCurrency(charge.value)}).`
      : `O valor pago precisa ficar entre ${formatCurrency(charge.value)} e ${formatCurrency(max)}.`;
  }
  if (!form.paidAt || !isValidInputDate(form.paidAt)) return "Informe uma data de pagamento válida.";
  if (form.paidAt > todayInputDate()) return "A data do pagamento não pode ser futura.";
  if (form.notes.trim().length > 255) return "A observação deve ter no máximo 255 caracteres.";
  return "";
}
