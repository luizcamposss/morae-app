import { CircleCheck, TriangleAlert, type LucideIcon } from "lucide-react";
import { formatCalendarDate, formatTime, toAppDateString } from "../../shared/lib/date";
import { MAINTENANCE_STATUS, maintenanceCategories, scopeLabel } from "../maintenance/maintenanceMeta";
import type { MaintenancePlanResponse } from "../maintenance/types";
import { OCCURRENCE_STATUS, formatPlace, statusMeta } from "../occurrences/occurrenceMeta";
import type { OccurrenceResponse } from "../occurrences/types";
import { VISIT_STATUS, addDays, formatVisitPlace, visitorTypeMeta, weekdayOf } from "../visits/visitMeta";
import type { VisitResponse } from "../visits/types";

export type AgendaKind = "maintenance" | "visit" | "occurrence";

export type AgendaView = "twoWeeks" | "month";

export type AgendaItem = {
  key: string;
  kind: AgendaKind;
  // Calendar date "yyyy-MM-dd" (São Paulo) and "HH:mm" when the item has a time.
  date: string;
  time: string | null;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  // Icon square: soft background + strong color (DESIGN.md "Status Em Par").
  tone: string;
  muted?: boolean;
};

// Screen of each module, relative to the area base path ("/admin" or "/syndic").
export const agendaKinds: Record<AgendaKind, { label: string; path: string; dot: string }> = {
  maintenance: { label: "Manutenções", path: "preventive-maintenance", dot: "bg-ambar" },
  visit: { label: "Visitas", path: "visitors", dot: "bg-tinta" },
  occurrence: { label: "Ocorrências", path: "occurrences", dot: "bg-vermelho" },
};

export const WEEKDAY_HEADERS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

// The visits agenda accepts up to 31 days per request.
export const VISIT_CHUNK_DAYS = 31;

// Monday on or before the date (the calendar weeks start on Monday).
export function startOfWeek(value: string) {
  return addDays(value, -((weekdayOf(value) + 6) % 7));
}

export function startOfMonth(value: string) {
  return `${value.slice(0, 7)}-01`;
}

export function addMonths(value: string, months: number) {
  const [year, month] = value.slice(0, 7).split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + months, 1));
  return date.toISOString().slice(0, 10);
}

// Days shown by the view: 14 days from the Monday of the anchor's week, or the whole weeks
// that cover the anchor's month (35 or 42 days).
export function rangeOf(view: AgendaView, anchor: string) {
  if (view === "twoWeeks") {
    const from = startOfWeek(anchor);
    return { from, to: addDays(from, 13) };
  }

  const first = startOfMonth(anchor);
  const last = addDays(addMonths(first, 1), -1);
  const from = startOfWeek(first);
  const to = addDays(startOfWeek(last), 6);
  return { from, to };
}

export function daysBetween(from: string, to: string) {
  const days: string[] = [];
  for (let day = from; day <= to; day = addDays(day, 1)) days.push(day);
  return days;
}

// "Outubro de 2026" for the month; "12 a 25 de outubro" or "28 de setembro a 11 de outubro" for two weeks.
export function rangeTitle(view: AgendaView, anchor: string) {
  if (view === "month") {
    const month = MONTHS[Number(anchor.slice(5, 7)) - 1];
    return `${month.charAt(0).toUpperCase()}${month.slice(1)} de ${anchor.slice(0, 4)}`;
  }

  const { from, to } = rangeOf(view, anchor);
  const fromMonth = MONTHS[Number(from.slice(5, 7)) - 1];
  const toMonth = MONTHS[Number(to.slice(5, 7)) - 1];
  const fromDay = Number(from.slice(8, 10));
  const toDay = Number(to.slice(8, 10));

  return fromMonth === toMonth ? `${fromDay} a ${toDay} de ${toMonth}` : `${fromDay} de ${fromMonth} a ${toDay} de ${toMonth}`;
}

// Whole-day items first, then by time and title.
export function compareItems(a: AgendaItem, b: AgendaItem) {
  return (a.time ?? "").localeCompare(b.time ?? "") || a.title.localeCompare(b.title, "pt-BR");
}

const maintenanceTones: Record<number, string> = {
  [MAINTENANCE_STATUS.upToDate]: "bg-ambar-suave text-ambar",
  [MAINTENANCE_STATUS.dueSoon]: "bg-ambar-suave text-ambar",
  [MAINTENANCE_STATUS.overdue]: "bg-vermelho-suave text-vermelho",
};

// Each plan gives its next due date and, when it falls in the period, the last time it was done
// (the plan already carries it, so no extra request per plan is needed).
export function maintenanceItems(plans: MaintenancePlanResponse[], from: string, to: string): AgendaItem[] {
  const items: AgendaItem[] = [];

  for (const plan of plans) {
    const due = plan.nextDueDate.slice(0, 10);
    const done = plan.lastPerformedOn?.slice(0, 10);
    const category = maintenanceCategories[plan.category] ?? maintenanceCategories[9];

    if (due >= from && due <= to) {
      const status = plan.status === MAINTENANCE_STATUS.overdue ? "Atrasada" : "Vence";
      items.push({
        key: `maintenance-due-${plan.id}`,
        kind: "maintenance",
        date: due,
        time: null,
        title: plan.name,
        subtitle: `${status} · ${scopeLabel(plan)}`,
        icon: category.icon,
        tone: maintenanceTones[plan.status],
      });
    }

    if (done && done >= from && done <= to) {
      items.push({
        key: `maintenance-done-${plan.id}`,
        kind: "maintenance",
        date: done,
        time: null,
        title: plan.name,
        subtitle: `Feita${plan.providerName ? ` · ${plan.providerName}` : ""}`,
        icon: CircleCheck,
        tone: "bg-verde-suave text-verde-tinta",
        muted: true,
      });
    }
  }

  return items;
}

// One item per day the visit happens (the API already expands recurring visits into `dates`).
export function visitItems(visits: VisitResponse[]): AgendaItem[] {
  return visits
    .filter((visit) => visit.status === VISIT_STATUS.active)
    .flatMap((visit) =>
      (visit.dates ?? []).map((date) => ({
        key: `visit-${visit.id}-${date}`,
        kind: "visit" as const,
        date,
        time: visit.startTime?.slice(0, 5) ?? null,
        title: visit.visitorName,
        subtitle: `${visitorTypeMeta(visit.visitorType).chip} · ${formatVisitPlace(visit)}`,
        icon: visitorTypeMeta(visit.visitorType).icon,
        tone: "bg-campo text-tinta",
      })),
    );
}

// Occurrences have no deadline: they show on the day they were opened, at the time they were opened.
export function occurrenceItems(occurrences: OccurrenceResponse[], from: string, to: string, showBuilding: boolean): AgendaItem[] {
  return occurrences.flatMap((occurrence) => {
    const date = toAppDateString(occurrence.createdAt);
    if (occurrence.status === OCCURRENCE_STATUS.canceled || date < from || date > to) return [];

    const isPending = occurrence.status === OCCURRENCE_STATUS.open || occurrence.status === OCCURRENCE_STATUS.inProgress;
    return [{
      key: `occurrence-${occurrence.id}`,
      kind: "occurrence" as const,
      date,
      time: formatTime(occurrence.createdAt),
      title: occurrence.title,
      subtitle: `${statusMeta(occurrence.status).label} · ${formatPlace(occurrence, showBuilding)}`,
      icon: TriangleAlert,
      tone: isPending ? "bg-vermelho-suave text-vermelho" : "bg-campo text-tinta-suave",
      muted: !isPending,
    }];
  });
}

// The nearest maintenance that is due in 30 days or less (or already overdue), for the highlight.
export function nearestDue(plans: MaintenancePlanResponse[]) {
  const pending = plans.filter((plan) => plan.status !== MAINTENANCE_STATUS.upToDate);
  if (pending.length === 0) return null;

  const plan = pending.reduce((nearest, item) => (item.daysUntilDue < nearest.daysUntilDue ? item : nearest));
  return { plan, others: pending.length - 1 };
}

// "Renovação do AVCB em 7 dias", "… vence amanhã", "… atrasada há 3 dias".
export function nearestDueTitle(plan: MaintenancePlanResponse) {
  const days = plan.daysUntilDue;
  if (days < 0) return `${plan.name} atrasada há ${Math.abs(days)} dia${days === -1 ? "" : "s"}`;
  if (days === 0) return `${plan.name} vence hoje`;
  if (days === 1) return `${plan.name} vence amanhã`;
  return `${plan.name} em ${days} dias`;
}

export function nearestDueSubtitle(plan: MaintenancePlanResponse, others: number) {
  const parts = [`Vencimento em ${formatCalendarDate(plan.nextDueDate)}`, scopeLabel(plan), "aviso à gestão 30 e 7 dias antes"];
  if (others > 0) parts.push(`mais ${others} pede${others === 1 ? "" : "m"} atenção`);
  return parts.join(" · ");
}
