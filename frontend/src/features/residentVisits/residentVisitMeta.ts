import { WEEKDAYS_SHORT, addDays, formatDayMonth, weekdayOf } from "../visits/visitMeta";
import type { VisitResponse } from "../visits/types";

// Next day (from today on) on which an active visit happens; the start date while it is ahead.
export function nextVisitDate(visit: Pick<VisitResponse, "startDate" | "endDate" | "daysOfWeek">, today: string) {
  let day = visit.startDate > today ? visit.startDate : today;

  for (let step = 0; step < 7 && day <= visit.endDate; step++, day = addDays(day, 1)) {
    if (!visit.daysOfWeek.length || visit.daysOfWeek.includes(weekdayOf(day))) return day;
  }
  return visit.startDate > today ? visit.startDate : today;
}

// "seg, qua até 31/12" or "todo dia até 31/12" (short line of a recurring visit).
export function describeRecurrence(visit: Pick<VisitResponse, "endDate" | "daysOfWeek">) {
  const days = visit.daysOfWeek.length && visit.daysOfWeek.length < 7
    ? [...visit.daysOfWeek].sort().map((day) => WEEKDAYS_SHORT[day]).join(", ")
    : "todo dia";
  return `${days} até ${formatDayMonth(visit.endDate)}`;
}
