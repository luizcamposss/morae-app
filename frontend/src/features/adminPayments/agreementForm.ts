import { todayInputDate } from "../../shared/lib/date";
import { CHARGE_STATUS } from "../charges/platformRevenue";
import type { ChargeResponse } from "../charges/types";
import type { AgreementDiscountType, CreateAgreementRequest } from "../agreements/types";
import { parseCurrencyInput } from "./chargeForm";

export type AgreementStep = 1 | 2 | 3 | 4;

export type AgreementForm = {
  unitId: string;
  chargeIds: number[];
  discountType: AgreementDiscountType;
  discountValue: string;
  hasDownPayment: boolean;
  downPayment: string;
  downPaymentDueDate: string;
  installmentCount: string;
  firstDueDate: string;
  breakAfterDaysLate: string;
};

export type AgreementTotals = {
  original: number;
  fine: number;
  interest: number;
  lateFees: number;
  discount: number;
  total: number;
};

export type SimulatedInstallment = { number: number; value: number; dueDate: string };

export const MAX_INSTALLMENTS = 36;
export const DEFAULT_BREAK_DAYS = 30;

const toCents = (value: number) => Math.round(value * 100);

// Overdue charges that can go into an agreement (not already part of one).
export function agreementCandidates(charges: ChargeResponse[]) {
  return charges.filter((charge) => charge.scope === 2 && charge.unitId && charge.status === CHARGE_STATUS.overdue && !charge.agreementId);
}

export function candidatesOfUnit(charges: ChargeResponse[], unitId: string) {
  return agreementCandidates(charges)
    .filter((charge) => String(charge.unitId) === unitId)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

// "YYYY-MM-DD" n months later, on the given day (the last day in short months), as the API does.
export function addMonthsOnDay(date: string, months: number, day: number) {
  const [year, month] = date.split("-").map(Number);
  const index = year * 12 + (month - 1) + months;
  const y = Math.floor(index / 12);
  const m = (index % 12) + 1;
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${y}-${String(m).padStart(2, "0")}-${String(Math.min(day, lastDay)).padStart(2, "0")}`;
}

export function initialAgreementForm(unitId: string, charges: ChargeResponse[]): AgreementForm {
  const today = todayInputDate();
  return {
    unitId,
    chargeIds: candidatesOfUnit(charges, unitId).map((charge) => charge.id),
    discountType: 0,
    discountValue: "",
    hasDownPayment: false,
    downPayment: "",
    downPaymentDueDate: today,
    installmentCount: "3",
    firstDueDate: addMonthsOnDay(today, 1, Number(today.slice(8))),
    breakAfterDaysLate: String(DEFAULT_BREAK_DAYS),
  };
}

export function chosenCharges(form: AgreementForm, charges: ChargeResponse[]) {
  return candidatesOfUnit(charges, form.unitId).filter((charge) => form.chargeIds.includes(charge.id));
}

// Same math as the API: fine/interest of today, discount only on them, rounded to the cent.
export function agreementTotals(form: AgreementForm, charges: ChargeResponse[]): AgreementTotals {
  const chosen = chosenCharges(form, charges);
  const original = chosen.reduce((sum, charge) => sum + toCents(charge.value), 0);
  const fine = chosen.reduce((sum, charge) => sum + toCents(charge.fineAmount), 0);
  const interest = chosen.reduce((sum, charge) => sum + toCents(charge.interestAmount), 0);
  const lateFees = fine + interest;
  const raw = parseCurrencyInput(form.discountValue) || 0;
  const discount =
    form.discountType === 1 ? Math.round((lateFees * Math.min(Math.max(raw, 0), 100)) / 100) : form.discountType === 2 ? Math.min(Math.max(toCents(raw), 0), lateFees) : 0;

  return {
    original: original / 100,
    fine: fine / 100,
    interest: interest / 100,
    lateFees: lateFees / 100,
    discount: discount / 100,
    total: (original + lateFees - discount) / 100,
  };
}

// Down payment (number 0) plus N equal installments; the last one takes the leftover cents.
export function simulateInstallments(form: AgreementForm, total: number): SimulatedInstallment[] {
  const count = Number(form.installmentCount);
  if (!count || count < 1 || !form.firstDueDate) return [];

  const down = form.hasDownPayment ? toCents(parseCurrencyInput(form.downPayment) || 0) : 0;
  const rest = toCents(total) - down;
  const each = Math.floor(rest / count);
  const day = Number(form.firstDueDate.slice(8));
  const list: SimulatedInstallment[] = [];

  if (down > 0) list.push({ number: 0, value: down / 100, dueDate: form.downPaymentDueDate });

  for (let number = 1; number <= count; number++) {
    const cents = number === count ? rest - each * (count - 1) : each;
    list.push({ number, value: cents / 100, dueDate: addMonthsOnDay(form.firstDueDate, number - 1, day) });
  }

  return list;
}

export function validateAgreementStep(step: AgreementStep, form: AgreementForm, totals: AgreementTotals) {
  const today = todayInputDate();

  if (step === 1) {
    if (!form.unitId) return "Escolha a unidade.";
    if (form.chargeIds.length === 0) return "Escolha ao menos uma cobrança atrasada.";
  }

  if (step === 2 && form.discountType !== 0) {
    const raw = parseCurrencyInput(form.discountValue);
    if (Number.isNaN(raw) || raw < 0) return "Informe um desconto válido.";
    if (form.discountType === 1 && raw > 100) return "O desconto vai de 0% a 100%.";
    if (form.discountType === 2 && raw > totals.lateFees) return "O desconto não pode passar da multa e dos juros.";
  }

  if (step === 3) {
    const count = Number(form.installmentCount);
    if (!Number.isInteger(count) || count < 1 || count > MAX_INSTALLMENTS) return `Escolha de 1 a ${MAX_INSTALLMENTS} parcelas.`;
    if (!form.firstDueDate || form.firstDueDate < today) return "A primeira parcela não pode vencer numa data passada.";

    if (form.hasDownPayment) {
      const down = parseCurrencyInput(form.downPayment);
      if (!down || down <= 0) return "Informe o valor da entrada.";
      if (down >= totals.total) return "A entrada precisa ser menor que o total do acordo.";
      if (!form.downPaymentDueDate || form.downPaymentDueDate < today) return "A entrada não pode vencer numa data passada.";
      if (form.firstDueDate <= form.downPaymentDueDate) return "A primeira parcela precisa vencer depois da entrada.";
    }

    const days = Number(form.breakAfterDaysLate);
    if (!Number.isInteger(days) || days < 1 || days > 180) return "A quebra do acordo vai de 1 a 180 dias de atraso.";

    const installments = simulateInstallments(form, totals.total).filter((item) => item.number > 0);
    if (installments.some((item) => item.value <= 0)) return "O valor das parcelas precisa ser maior que zero.";
  }

  return "";
}

// The person who gets the installments: the one the chosen charges were addressed to, when all share it.
export function agreementRecipient(chosen: ChargeResponse[]) {
  const ids = new Set(chosen.map((charge) => charge.recipientPersonId ?? null));
  const only = ids.size === 1 ? chosen[0] : undefined;
  return only?.recipientPersonId ? { id: only.recipientPersonId, name: only.recipientName ?? "" } : null;
}

export function toCreateAgreementRequest(form: AgreementForm, chosen: ChargeResponse[]): CreateAgreementRequest {
  return {
    unitId: Number(form.unitId),
    recipientPersonId: agreementRecipient(chosen)?.id ?? null,
    chargeIds: chosen.map((charge) => charge.id),
    discountType: form.discountType,
    discountValue: form.discountType === 0 ? 0 : parseCurrencyInput(form.discountValue) || 0,
    downPayment: form.hasDownPayment ? parseCurrencyInput(form.downPayment) : null,
    downPaymentDueDate: form.hasDownPayment ? form.downPaymentDueDate : null,
    installmentCount: Number(form.installmentCount),
    firstInstallmentDueDate: form.firstDueDate,
    breakAfterDaysLate: Number(form.breakAfterDaysLate),
    notes: null,
  };
}
