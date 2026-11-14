import { formatCurrency } from "../../shared/lib/currency";
import { formatCalendarDate, todayInputDate } from "../../shared/lib/date";
import { CHARGE_CATEGORIES, categoryLabel } from "../charges/chargeCategories";
import type { ChargeCategory, ChargeUnitValue } from "../charges/types";
import type { UnitResponse } from "../units/types";
import { isValidInputDate, nextDueDate, parseCurrencyInput, unitLabel, validateMoney } from "./chargeForm";
import { toCents } from "../masterPayments/platformChargeForm";

// "Nova cobrança" wizard: what (category) → from whom (one unit or many) → how much and when.
// Underneath it uses the existing routes: single charge, batch or recurring charge.
export type WizardStep = 1 | 2 | 3 | 4;
export type ChargeTarget = "unit" | "many";
export type ManyScope = "all" | "building" | "pick";
export type Pricing = "same" | "perUnit" | "reading";
export type MeterReading = { previous: string; current: string };

export type NewChargeForm = {
  category: ChargeCategory | null;
  target: ChargeTarget;
  unitId: string;
  onlyOnePerson: boolean;
  recipientPersonId: string;
  manyScope: ManyScope;
  buildingId: string;
  pickedUnitIds: number[];
  pricing: Pricing;
  value: string;
  unitValues: Record<number, string>;
  readings: Record<number, MeterReading>;
  rate: string; // R$ per m³ / kWh
  minimum: string; // optional minimum charge per unit
  repeat: boolean;
  dueDate: string;
  dueDay: string;
  description: string;
  descriptionEdited: boolean;
};

export function initialNewChargeForm(billingDueDay: number | null, repeat = false): NewChargeForm {
  return {
    category: null,
    target: "many",
    unitId: "",
    onlyOnePerson: false,
    recipientPersonId: "",
    manyScope: "all",
    buildingId: "",
    pickedUnitIds: [],
    pricing: "same",
    value: "",
    unitValues: {},
    readings: {},
    rate: "",
    minimum: "",
    repeat,
    dueDate: billingDueDay ? nextDueDate(billingDueDay) : "",
    dueDay: billingDueDay ? String(billingDueDay) : "",
    description: "",
    descriptionEdited: false,
  };
}

const shortMonth = new Intl.DateTimeFormat("pt-BR", { month: "short", timeZone: "UTC" });

// "Água · nov/2026" (or just "Aluguel" for a recurrence, which repeats every month).
export function suggestedDescription(form: NewChargeForm) {
  if (!form.category) return "";
  const label = CHARGE_CATEGORIES[form.category].label;
  if (form.repeat || !isValidInputDate(form.dueDate)) return label;
  const [year, month] = form.dueDate.split("-").map(Number);
  return `${label} · ${shortMonth.format(new Date(Date.UTC(year, month - 1, 1))).replace(".", "")}/${year}`;
}

export function isMetered(form: Pick<NewChargeForm, "category">) {
  return Boolean(form.category && CHARGE_CATEGORIES[form.category].isMetered);
}

// Recurrence = one unit, the whole condominium or a building, never a hand-picked list or a reading.
export function canRepeat(form: NewChargeForm) {
  return form.pricing !== "reading" && !(form.target === "many" && form.manyScope === "pick");
}

// Units the charge reaches before the reading filter.
export function targetUnits(form: NewChargeForm, units: UnitResponse[]) {
  if (form.target === "unit") return units.filter((unit) => String(unit.id) === form.unitId);
  if (form.manyScope === "building") return units.filter((unit) => String(unit.buildingId) === form.buildingId);
  if (form.manyScope === "pick") return units.filter((unit) => form.pickedUnitIds.includes(unit.id));
  return units;
}

function parseReading(raw: string | undefined) {
  if (!raw?.trim()) return null;
  const value = Number(raw.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(value) ? value : NaN;
}

// Consumption and value of one unit by meter reading; null = no current reading typed (unit left out).
export function readingFor(form: NewChargeForm, unitId: number) {
  const reading = form.readings[unitId];
  const current = parseReading(reading?.current);
  if (current === null) return null;
  const previous = parseReading(reading?.previous) ?? 0;
  const consumption = current - previous;
  const rate = parseCurrencyInput(form.rate);
  const minimum = form.minimum.trim() ? parseCurrencyInput(form.minimum) : 0;
  const raw = Number.isFinite(rate) ? consumption * rate : NaN;
  const value = Math.round(Math.max(raw, Number.isFinite(minimum) ? minimum : 0) * 100) / 100;
  return { consumption, value, isValid: Number.isFinite(current) && Number.isFinite(previous) && consumption >= 0 };
}

// What each billed unit pays: [unit, value] for every unit that will get a charge.
export function billedUnits(form: NewChargeForm, units: UnitResponse[]) {
  const scoped = targetUnits(form, units);
  const base = parseCurrencyInput(form.value);

  if (form.pricing === "reading") {
    return scoped.flatMap((unit) => {
      const reading = readingFor(form, unit.id);
      return reading ? [{ unit, value: reading.value }] : [];
    });
  }

  return scoped.map((unit) => {
    const custom = form.pricing === "perUnit" ? form.unitValues[unit.id]?.trim() : "";
    return { unit, value: custom ? parseCurrencyInput(custom) : base };
  });
}

export function validateStep(step: WizardStep, form: NewChargeForm, units: UnitResponse[]) {
  if (step === 1) return form.category ? "" : "Escolha o que você quer cobrar.";

  if (step === 2) {
    if (form.target === "unit") {
      if (!form.unitId) return "Escolha a unidade.";
      if (form.onlyOnePerson && !form.recipientPersonId) return "Escolha a pessoa que vai receber a cobrança.";
      return "";
    }
    if (form.manyScope === "building" && !form.buildingId) return "Escolha o prédio.";
    if (form.manyScope === "pick" && form.pickedUnitIds.length === 0) return "Escolha pelo menos uma unidade.";
    return targetUnits(form, units).length ? "" : "Nenhuma unidade neste prédio.";
  }

  if (form.pricing === "reading") {
    const rate = validateMoney(form.rate, `o valor por ${form.category === 4 ? "kWh" : "m³"}`);
    if (rate) return rate;
    if (form.minimum.trim() && validateMoney(form.minimum, "a taxa mínima")) return "A taxa mínima precisa ser maior que zero, com até duas casas.";
    const scoped = targetUnits(form, units);
    const readings = scoped.map((unit) => readingFor(form, unit.id)).filter((item) => item !== null);
    if (readings.length === 0) return "Digite a leitura atual de pelo menos uma unidade.";
    if (readings.some((item) => !item.isValid)) return "Confira as leituras: a atual não pode ser menor que a anterior.";
    if (readings.some((item) => item.value <= 0)) return "Há unidade com valor zero. Confira a leitura ou informe uma taxa mínima.";
  } else {
    const money = validateMoney(form.value, form.pricing === "perUnit" ? "o valor padrão" : "o valor");
    if (money) return money;
    if (form.pricing === "perUnit") {
      for (const raw of Object.values(form.unitValues)) {
        if (raw.trim() && validateMoney(raw, "o valor da unidade")) return "Confira os valores por unidade: maiores que zero, com até duas casas.";
      }
    }
  }

  if (form.repeat && canRepeat(form)) {
    const day = Number(form.dueDay);
    if (!Number.isInteger(day) || day < 1 || day > 31) return "O dia de vencimento vai de 1 a 31.";
  } else {
    if (!form.dueDate || !isValidInputDate(form.dueDate)) return "Informe uma data de vencimento válida.";
    if (form.dueDate < todayInputDate()) return "O vencimento não pode ser anterior a hoje.";
  }

  const description = form.description.trim();
  if (description.length < 3) return "A descrição precisa ter pelo menos 3 caracteres.";
  if (description.length > 255) return "A descrição deve ter no máximo 255 caracteres.";
  return "";
}

// "Vai criar 32 cobranças de Água, total R$ 4.210,00, vencimento 10/12/2026."
export function summarize(form: NewChargeForm, units: UnitResponse[], recipientName?: string) {
  const billed = billedUnits(form, units);
  const label = categoryLabel(form.category);
  const total = billed.reduce((sum, item) => sum + item.value, 0);
  const forWhom = recipientName ? ` para ${recipientName}` : "";

  if (form.repeat && canRepeat(form)) {
    const where = form.target === "unit" ? (billed[0] ? unitLabel(billed[0].unit) : "") : `${billed.length} ${billed.length === 1 ? "unidade" : "unidades"}`;
    return `Vai criar uma recorrência de ${label}${forWhom}: ${formatCurrency(total)} por mês (${where}), vencendo todo dia ${form.dueDay}.`;
  }

  const count = billed.length;
  return `Vai criar ${count} ${count === 1 ? "cobrança" : "cobranças"} de ${label}${forWhom}, total ${formatCurrency(total)}, vencimento ${formatCalendarDate(form.dueDate)}.`;
}

// Units whose value differs from the default (or every unit, for a reading).
export function unitValuesFor(form: NewChargeForm, units: UnitResponse[]): ChargeUnitValue[] {
  const billed = billedUnits(form, units);
  if (form.pricing === "reading") return billed.map((item) => ({ unitId: item.unit.id, value: item.value }));
  if (form.pricing !== "perUnit") return [];
  const defaultCents = toCents(parseCurrencyInput(form.value));
  return billed.filter((item) => toCents(item.value) !== defaultCents).map((item) => ({ unitId: item.unit.id, value: item.value }));
}
