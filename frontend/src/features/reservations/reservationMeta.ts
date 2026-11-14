import { formatCurrency } from "../../shared/lib/currency";
import { formatCalendarDate } from "../../shared/lib/date";
import type { CommonAreaResponse, ReservationResponse, ReservationStatus, SaveCommonAreaRequest } from "./types";

export const RESERVATION_STATUS = { pending: 1, approved: 2, rejected: 3, canceled: 4 } as const;

// Chip colors follow DESIGN.md "Status Em Par" (soft background + strong text).
const statusMeta: Record<ReservationStatus, { label: string; tone: string }> = {
  1: { label: "Aguardando aprovação", tone: "bg-ambar-suave text-ambar" },
  2: { label: "Confirmada", tone: "bg-verde-suave text-verde-tinta" },
  3: { label: "Recusada", tone: "bg-vermelho-suave text-vermelho" },
  4: { label: "Cancelada", tone: "bg-campo text-tinta-suave" },
};

export function reservationStatusMeta(status: ReservationStatus) {
  return statusMeta[status] ?? statusMeta[4];
}

// "18:00–23:00", or null for the whole day.
export function formatHours(item: { startTime: string | null; endTime: string | null }) {
  return item.startTime && item.endTime ? `${item.startTime.slice(0, 5)}–${item.endTime.slice(0, 5)}` : null;
}

// "Noite · 18:00–23:00" or "Dia inteiro".
export function formatSlot(item: { shiftName?: string; name?: string; startTime: string | null; endTime: string | null }) {
  const hours = formatHours(item);
  const name = item.shiftName ?? item.name ?? "";
  return hours ? `${name} · ${hours}` : name;
}

// Short rule lines shown on the area card and before confirming.
export function describeRules(area: CommonAreaResponse) {
  const rules: string[] = [];
  rules.push(area.fullDay ? "Reserva do dia inteiro" : `Turnos: ${area.shifts.map((shift) => `${shift.name} ${formatHours(shift)}`).join(", ")}`);
  rules.push(
    area.minAdvanceDays > 0
      ? `De ${area.minAdvanceDays} a ${area.maxAdvanceDays} dias de antecedência`
      : `Até ${area.maxAdvanceDays} dias de antecedência`,
  );
  if (area.monthlyLimitPerUnit) rules.push(`${area.monthlyLimitPerUnit} reserva${area.monthlyLimitPerUnit === 1 ? "" : "s"} por unidade por mês`);
  rules.push(area.requiresApproval ? "Precisa de aprovação da gestão" : "Confirmação na hora");
  if (area.fee) {
    rules.push(
      area.freeCancellationDays === null
        ? `Taxa de ${formatCurrency(area.fee)}`
        : `Taxa de ${formatCurrency(area.fee)}, cancelamento sem custo até ${area.freeCancellationDays} dia${area.freeCancellationDays === 1 ? "" : "s"} antes`,
    );
  } else {
    rules.push("Sem taxa");
  }
  return rules;
}

// What happens with the fee if the resident cancels now.
export function cancelFeeNotice(reservation: ReservationResponse, today: string) {
  if (!reservation.fee || !reservation.chargeId) return "";
  if (reservation.chargeStatus === 2) return " A taxa já foi paga: fale com a administração sobre a devolução.";
  if (reservation.chargeStatus === 4) return "";
  if (!reservation.freeCancellationUntil || today <= reservation.freeCancellationUntil) return " A cobrança da taxa também é cancelada.";
  return ` O prazo para cancelar sem custo terminou em ${formatCalendarDate(reservation.freeCancellationUntil)}: a taxa de ${formatCurrency(reservation.fee)} continua.`;
}

// Form fields as strings, converted on submit.
export type AreaForm = {
  name: string;
  description: string;
  capacity: string;
  buildingId: string;
  isActive: boolean;
  fullDay: boolean;
  shifts: Array<{ id?: number; name: string; startTime: string; endTime: string }>;
  minAdvanceDays: string;
  maxAdvanceDays: string;
  monthlyLimitPerUnit: string;
  requiresApproval: boolean;
  fee: string;
  freeCancellationDays: string;
  terms: string;
};

export function toAreaForm(area: CommonAreaResponse | null): AreaForm {
  if (!area) {
    return {
      name: "",
      description: "",
      capacity: "",
      buildingId: "",
      isActive: true,
      fullDay: false,
      shifts: [
        { name: "Almoço", startTime: "11:00", endTime: "16:00" },
        { name: "Noite", startTime: "18:00", endTime: "23:00" },
      ],
      minAdvanceDays: "2",
      maxAdvanceDays: "90",
      monthlyLimitPerUnit: "",
      requiresApproval: true,
      fee: "",
      freeCancellationDays: "",
      terms: "",
    };
  }

  return {
    name: area.name,
    description: area.description ?? "",
    capacity: area.capacity ? String(area.capacity) : "",
    buildingId: area.buildingId ? String(area.buildingId) : "",
    isActive: area.isActive,
    fullDay: area.fullDay,
    shifts: area.shifts.map((shift) => ({ id: shift.id, name: shift.name, startTime: shift.startTime.slice(0, 5), endTime: shift.endTime.slice(0, 5) })),
    minAdvanceDays: String(area.minAdvanceDays),
    maxAdvanceDays: String(area.maxAdvanceDays),
    monthlyLimitPerUnit: area.monthlyLimitPerUnit ? String(area.monthlyLimitPerUnit) : "",
    requiresApproval: area.requiresApproval,
    fee: area.fee ? String(area.fee).replace(".", ",") : "",
    freeCancellationDays: area.freeCancellationDays === null ? "" : String(area.freeCancellationDays),
    terms: area.terms ?? "",
  };
}

const optionalNumber = (value: string) => (value.trim() === "" ? null : Number(value));

// "1.250,50" or "150" → 1250.5. Invalid text becomes NaN and the API answers with the message.
export function parseMoney(value: string) {
  const clean = value.trim().replace(/\s|R\$/g, "");
  if (!clean) return null;
  return Number(clean.includes(",") ? clean.replace(/\./g, "").replace(",", ".") : clean);
}

export function toAreaRequest(form: AreaForm): SaveCommonAreaRequest {
  const fee = parseMoney(form.fee);
  return {
    name: form.name.trim(),
    description: form.description.trim() || null,
    capacity: optionalNumber(form.capacity),
    buildingId: form.buildingId ? Number(form.buildingId) : null,
    isActive: form.isActive,
    fullDay: form.fullDay,
    shifts: form.fullDay ? [] : form.shifts,
    minAdvanceDays: Number(form.minAdvanceDays || 0),
    maxAdvanceDays: Number(form.maxAdvanceDays || 0),
    monthlyLimitPerUnit: optionalNumber(form.monthlyLimitPerUnit),
    requiresApproval: form.requiresApproval,
    fee: fee && fee > 0 ? fee : null,
    freeCancellationDays: fee && fee > 0 ? optionalNumber(form.freeCancellationDays) : null,
    terms: form.terms.trim() || null,
  };
}
