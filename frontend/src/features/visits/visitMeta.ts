import { CircleUserRound, HandPlatter, User, Wrench, type LucideIcon } from "lucide-react";
import { formatCalendarDate } from "../../shared/lib/date";
import type { VisitResponse, VisitorType } from "./types";

export const VISIT_STATUS = { active: 1, canceled: 2 } as const;

export const visitorTypes: Array<{ value: VisitorType; label: string; chip: string; hint: string; icon: LucideIcon; tone: string }> = [
  { value: 1, label: "Visitante", chip: "Visitante", hint: "Amigo, parente, convidado", icon: User, tone: "bg-campo text-tinta" },
  { value: 2, label: "Prestador de serviço", chip: "Prestador", hint: "Técnico, entrega, mudança", icon: Wrench, tone: "bg-campo text-tinta" },
  { value: 3, label: "Funcionário da casa", chip: "Da casa", hint: "Diarista, babá, cuidador", icon: HandPlatter, tone: "bg-verde-suave text-verde-tinta" },
  { value: 4, label: "Outro", chip: "Outro", hint: "Qualquer outro caso", icon: CircleUserRound, tone: "bg-campo text-tinta" },
];

export function visitorTypeMeta(type: VisitorType) {
  return visitorTypes.find((item) => item.value === type) ?? visitorTypes[3];
}

export const WEEKDAYS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
export const WEEKDAYS_SHORT = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

// Calendar-date math on "yyyy-MM-dd" strings, in UTC so no time zone can shift the day.
function toUtc(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function addDays(value: string, days: number) {
  const date = toUtc(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function weekdayOf(value: string) {
  return toUtc(value).getUTCDay();
}

// "10/10" (day and month only).
export function formatDayMonth(value: string) {
  return formatCalendarDate(value).slice(0, 5);
}

// "Hoje, sábado 10/10", "Amanhã, domingo 11/10", "Segunda, 12/10".
export function formatDayHeading(value: string, today: string) {
  const weekday = WEEKDAYS[weekdayOf(value)];
  const relative = value === today ? "Hoje" : value === addDays(today, 1) ? "Amanhã" : value === addDays(today, -1) ? "Ontem" : "";

  if (relative) return `${relative}, ${weekday} ${formatDayMonth(value)}`;
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}, ${formatDayMonth(value)}`;
}

// "Sáb 10".
export function formatShortDay(value: string) {
  const weekday = WEEKDAYS_SHORT[weekdayOf(value)];
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${value.slice(8, 10)}`;
}

export function isRecurring(visit: Pick<VisitResponse, "startDate" | "endDate">) {
  return visit.startDate !== visit.endDate;
}

// "17/10/2026" for one day; "De 01/10/2026 a 31/12/2026 · seg, qua" for a period.
export function describeSchedule(visit: Pick<VisitResponse, "startDate" | "endDate" | "daysOfWeek">) {
  if (!isRecurring(visit)) return formatCalendarDate(visit.startDate);

  const days = visit.daysOfWeek.length && visit.daysOfWeek.length < 7
    ? [...visit.daysOfWeek].sort().map((day) => WEEKDAYS_SHORT[day]).join(", ")
    : "todos os dias";

  return `De ${formatCalendarDate(visit.startDate)} a ${formatCalendarDate(visit.endDate)} · ${days}`;
}

// "08:00 às 17:00", or "Dia todo" when the visit has no time window.
export function describeTime(visit: Pick<VisitResponse, "startTime" | "endTime">) {
  return visit.startTime && visit.endTime ? `${visit.startTime.slice(0, 5)} às ${visit.endTime.slice(0, 5)}` : "Dia todo";
}

// "Torre A, unidade 101" → "Torre A · 101"; no unit → "Condomínio".
export function formatVisitPlace(visit: Pick<VisitResponse, "unitLabel">) {
  return visit.unitLabel ? visit.unitLabel.replace(", unidade ", " · ") : "Condomínio";
}
