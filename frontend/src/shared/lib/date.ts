// MORAÊ shows every date and time in São Paulo time, whatever the viewer's computer uses.
//
// Two kinds of values come from the API:
// - instants (createdAt, paidAt, expiresAt...): UTC with "Z"; shown converted to São Paulo;
// - calendar dates (a charge's dueDate): "YYYY-MM-DD..." with no time zone; shown exactly as
//   written, never shifted, or a due date would move to the previous day.
export const APP_TIME_ZONE = "America/Sao_Paulo";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: APP_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: APP_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const timeFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: APP_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
});

const todayHeadingFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: APP_TIME_ZONE,
  weekday: "long",
  day: "2-digit",
  month: "long",
});

const isoDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const inputDateTimeFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const hourFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: APP_TIME_ZONE,
  hour: "numeric",
  hourCycle: "h23",
});

function toDate(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

// Instant → "28/09/2026".
export function formatDate(value?: string | Date | null, fallback = "-") {
  const date = value ? toDate(value) : null;
  return date ? dateFormatter.format(date) : fallback;
}

// Instant → "28/09/2026, 20:18".
export function formatDateTime(value?: string | Date | null, fallback = "-") {
  const date = value ? toDate(value) : null;
  return date ? dateTimeFormatter.format(date) : fallback;
}

// Instant → "20:18".
export function formatTime(value?: string | Date | null, fallback = "-") {
  const date = value ? toDate(value) : null;
  return date ? timeFormatter.format(date) : fallback;
}

// Calendar date ("2026-10-05" or "2026-10-05T00:00:00") → "05/10/2026", with no time zone shift.
export function formatCalendarDate(value?: string | null, fallback = "-") {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : fallback;
}

// Calendar date → local-midnight Date with the same day, for sorting and month grouping.
export function parseCalendarDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Date(year, month - 1, day);
}

// Instant → its São Paulo calendar day as "YYYY-MM-DD" (for grouping by day or month).
export function toAppDateString(value: string | Date) {
  const date = toDate(value);
  return date ? isoDateFormatter.format(date) : "";
}

// Today's São Paulo date as "YYYY-MM-DD" (the value date inputs use).
export function todayInputDate() {
  return isoDateFormatter.format(new Date());
}

// Instant → its São Paulo time as "YYYY-MM-DDTHH:mm" (the value datetime-local inputs use).
export function toAppDateTimeInput(value?: string | Date | null) {
  const date = value ? toDate(value) : null;
  if (!date) return "";
  const parts = Object.fromEntries(inputDateTimeFormatter.formatToParts(date).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

// A calendar date strictly before today in São Paulo.
export function isPastCalendarDate(value: string) {
  return value.slice(0, 10) < todayInputDate();
}

export function currentHour() {
  return Number(hourFormatter.format(new Date()));
}

// "Bom dia" from 5h to 12h, "Boa tarde" until 18h, "Boa noite" otherwise (São Paulo time).
export function getGreeting() {
  const hour = currentHour();

  if (hour < 5) return "Boa noite";
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

// "Segunda-feira, 28 de setembro": only the first letter is capitalized.
export function formatTodayHeading() {
  return capitalizeFirst(todayHeadingFormatter.format(new Date()));
}

export function capitalizeFirst(value: string) {
  return value.charAt(0).toLocaleUpperCase("pt-BR") + value.slice(1);
}
