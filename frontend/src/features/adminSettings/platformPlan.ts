import type { ChargeResponse } from "../charges/types";
import { capitalizeFirst, parseCalendarDate } from "../../shared/lib/date";

export type PlatformPlanSummary =
  | { state: "empty" }
  | { state: "upToDate"; recentPaid: ChargeResponse[] }
  | { state: "pending"; next: ChargeResponse; recentPaid: ChargeResponse[] }
  | { state: "overdue"; next: ChargeResponse; overdueCount: number; overdueTotal: number; recentPaid: ChargeResponse[] };

const monthFormatter = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });

function byDueDate(a: ChargeResponse, b: ChargeResponse) {
  return a.dueDate.localeCompare(b.dueDate);
}

// Situation of the condominium's MORAÊ monthly fee, from its platform charges.
export function summarizePlatformPlan(charges: ChargeResponse[]): PlatformPlanSummary {
  if (charges.length === 0) return { state: "empty" };

  const recentPaid = charges.filter((charge) => charge.status === 2).sort(byDueDate).reverse().slice(0, 3);
  const open = charges.filter((charge) => charge.status === 1 || charge.status === 3).sort(byDueDate);
  const overdue = open.filter((charge) => charge.status === 3);

  if (overdue.length > 0) {
    return {
      state: "overdue",
      next: overdue[0],
      overdueCount: overdue.length,
      overdueTotal: overdue.reduce((total, charge) => total + charge.value, 0),
      recentPaid,
    };
  }

  if (open.length > 0) return { state: "pending", next: open[0], recentPaid };
  return { state: "upToDate", recentPaid };
}

// Charge due date → "Outubro de 2026".
export function formatDueMonth(dueDate: string) {
  return capitalizeFirst(monthFormatter.format(parseCalendarDate(dueDate)));
}
