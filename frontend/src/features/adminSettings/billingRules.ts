import type { BillingSettings } from "../charges/types";

export type BillingForm = { billingDueDay: string; lateFeeEnabled: boolean; finePercent: string; monthlyInterestPercent: string };

const formatPercent = (value: number) => String(value).replace(".", ",");

export function parsePercent(value: string) {
  return Number(value.trim().replace(",", "."));
}

export function toBillingForm(settings: BillingSettings): BillingForm {
  return {
    billingDueDay: String(settings.billingDueDay),
    lateFeeEnabled: settings.lateFeeEnabled,
    finePercent: formatPercent(settings.finePercent),
    monthlyInterestPercent: formatPercent(settings.monthlyInterestPercent),
  };
}

// "Multa e juros: 2% + 1% ao mês" or "Sem multa e juros", for the settings row.
export function describeBillingRules(settings: BillingSettings) {
  const lateFees = settings.lateFeeEnabled ? `multa ${formatPercent(settings.finePercent)}% e juros ${formatPercent(settings.monthlyInterestPercent)}% ao mês` : "sem multa e juros";
  return `Vence dia ${settings.billingDueDay} · ${lateFees}`;
}

export function validateBillingForm(form: BillingForm, settings: BillingSettings) {
  const day = Number(form.billingDueDay);
  if (!Number.isInteger(day) || day < 1 || day > 31) return "O dia do vencimento vai de 1 a 31.";
  if (!form.lateFeeEnabled) return "";

  const fine = parsePercent(form.finePercent);
  const interest = parsePercent(form.monthlyInterestPercent);
  if (!form.finePercent.trim() || !Number.isFinite(fine) || fine < 0 || fine > settings.maxFinePercent) {
    return `A multa vai de 0 a ${formatPercent(settings.maxFinePercent)}% (Código Civil).`;
  }
  if (!form.monthlyInterestPercent.trim() || !Number.isFinite(interest) || interest < 0 || interest > settings.maxMonthlyInterestPercent) {
    return `Os juros vão de 0 a ${formatPercent(settings.maxMonthlyInterestPercent)}% ao mês (Código Civil).`;
  }
  return "";
}
