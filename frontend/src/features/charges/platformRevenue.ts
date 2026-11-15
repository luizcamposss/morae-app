import { todayInputDate } from "../../shared/lib/date";
import type { ChargeResponse } from "./types";

export const CHARGE_STATUS = { pending: 1, paid: 2, overdue: 3, canceled: 4, renegotiated: 5, draft: 6 } as const;

export type RevenueMonth = { month: string; label: string; paid: number; open: number; overdue: number };

const monthLabel = new Intl.DateTimeFormat("pt-BR", { month: "short", timeZone: "UTC" });
const monthName = new Intl.DateTimeFormat("pt-BR", { month: "long", timeZone: "UTC" });

// Name of the current São Paulo month ("outubro").
export function currentMonthName() {
  const [year, month] = todayInputDate().split("-").map(Number);
  return monthName.format(new Date(Date.UTC(year, month - 1, 1)));
}

// N months as "YYYY-MM" keys (São Paulo calendar), oldest first, ending `ahead` months after the current one.
export function lastMonths(count: number, ahead = 0) {
  const [year, month] = todayInputDate().split("-").map(Number);

  return Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1 + ahead - (count - 1 - index), 1));
    return { month: date.toISOString().slice(0, 7), label: monthLabel.format(date).replace(".", "") };
  });
}

// Platform subscriptions per due month (up to next month): paid, still open and overdue values.
export function buildRevenueByMonth(charges: ChargeResponse[], months: number): RevenueMonth[] {
  return lastMonths(months, 1).map(({ month, label }) => {
    const inMonth = charges.filter((charge) => charge.dueDate.startsWith(month));
    const sum = (status: number) => inMonth.filter((charge) => charge.status === status).reduce((total, charge) => total + charge.value, 0);

    return { month, label, paid: sum(CHARGE_STATUS.paid), open: sum(CHARGE_STATUS.pending), overdue: sum(CHARGE_STATUS.overdue) };
  });
}
