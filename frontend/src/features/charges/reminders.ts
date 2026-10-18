import { toAppDateString, todayInputDate } from "../../shared/lib/date";
import type { ChargeResponse } from "./types";

// Reminders the scheduled job e-mailed today (São Paulo day), split by kind.
export function countRemindersToday(charges: ChargeResponse[]) {
  const today = todayInputDate();
  const isToday = (value?: string | null) => Boolean(value) && toAppDateString(value!) === today;
  const dueSoon = charges.filter((charge) => isToday(charge.dueSoonReminderSentAt)).length;
  const overdue = charges.filter((charge) => isToday(charge.overdueReminderSentAt)).length;
  return { total: dueSoon + overdue, dueSoon, overdue };
}

// "2 de vencimento e 1 de atraso", "de atraso" or "de vencimento".
export function describeReminders({ dueSoon, overdue }: { dueSoon: number; overdue: number }) {
  if (dueSoon && overdue) return `${dueSoon} de vencimento e ${overdue} de atraso`;
  return overdue ? "lembretes de atraso, por e-mail" : "lembretes de vencimento, por e-mail";
}
