import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { SelectField, type SelectChange } from "./SelectField";
import { popoverPanelClass, useAnchoredPopover } from "./useAnchoredPopover";

type PickerProps = {
  label: string;
  value: string;
  onChange: (event: SelectChange) => void;
  min?: string;
  max?: string;
  disabled?: boolean;
  error?: string;
  hint?: string;
  className?: string;
  placeholder?: string;
  // Only a calendar icon (the label is its accessible name), e.g. "go to a day" in an agenda.
  iconOnly?: boolean;
};

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];
const monthTitle = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
const monthShort = new Intl.DateTimeFormat("pt-BR", { month: "short", timeZone: "UTC" });
const fullDate = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

const pad = (value: number) => String(value).padStart(2, "0");
const toKey = (date: Date) => `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
const fromKey = (key: string) => {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(Date.UTC(year, (month || 1) - 1, day || 1));
};
const isValidKey = (key: string) => /^\d{4}-\d{2}-\d{2}$/.test(key) && !Number.isNaN(fromKey(key).getTime());
const todayKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};
const addDays = (key: string, days: number) => {
  const date = fromKey(key);
  date.setUTCDate(date.getUTCDate() + days);
  return toKey(date);
};
const addMonths = (key: string, months: number) => {
  const date = fromKey(key);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  const last = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, last));
  return toKey(date);
};
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

// Shell shared by the pickers: label, the button showing the value, hint/error.
function PickerShell({
  id,
  label,
  hint,
  error,
  className,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  const message = error ?? hint;
  return (
    <div className={`flex flex-col gap-2 ${className ?? ""}`}>
      <label htmlFor={id} className="text-sm font-semibold text-tinta">
        {label}
      </label>
      {children}
      {message && <p className={`text-[13px] leading-snug ${error ? "font-medium text-vermelho" : "text-tinta-suave"}`}>{message}</p>}
    </div>
  );
}

const triggerClass = (open: boolean, error?: string, empty?: boolean) =>
  `relative flex w-full items-center gap-2 rounded-field bg-campo py-3 pl-4 pr-10 text-left text-[15px] font-medium outline-none transition-[background-color,box-shadow] duration-150 focus-visible:bg-superficie focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${
    error ? "ring-2 ring-vermelho" : "focus-visible:ring-verde"
  } ${open ? "bg-superficie ring-2 ring-verde" : ""} ${empty ? "text-tinta-suave" : "text-tinta"}`;

// A calendar date ("AAAA-MM-DD"), in the app's look (no browser date picker).
export function DateField({ label, value, onChange, min, max, disabled, error, hint, className, placeholder = "dd/mm/aaaa", iconOnly = false }: PickerProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const { anchorRef, popoverRef, style } = useAnchoredPopover(open, close, 400, 296);
  const initial = isValidKey(value) ? value : todayKey();
  const [focused, setFocused] = useState(initial);
  const dayRefs = useRef(new Map<string, HTMLButtonElement>());

  useEffect(() => {
    if (open) dayRefs.current.get(focused)?.focus({ preventScroll: true });
  }, [open, focused]);

  const isOff = (key: string) => Boolean((min && key < min) || (max && key > max));
  const pick = (key: string) => {
    if (isOff(key)) return;
    onChange({ target: { value: key } });
    setOpen(false);
    anchorRef.current?.focus();
  };

  function openCalendar() {
    if (disabled) return;
    setFocused(isValidKey(value) ? value : min && todayKey() < min ? min : todayKey());
    setOpen(true);
  }

  function onGridKey(event: KeyboardEvent) {
    const moves: Record<string, () => string> = {
      ArrowLeft: () => addDays(focused, -1),
      ArrowRight: () => addDays(focused, 1),
      ArrowUp: () => addDays(focused, -7),
      ArrowDown: () => addDays(focused, 7),
      PageUp: () => addMonths(focused, -1),
      PageDown: () => addMonths(focused, 1),
    };
    if (moves[event.key]) {
      event.preventDefault();
      setFocused(moves[event.key]());
    }
  }

  const monthStart = fromKey(`${focused.slice(0, 7)}-01`);
  const firstWeekday = monthStart.getUTCDay();
  const gridStart = addDays(toKey(monthStart), -firstWeekday);
  const days = Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
  const shown = isValidKey(value) ? fromKey(value) : null;
  const today = todayKey();

  const panelElement = (
      <div ref={popoverRef} popover="manual" style={style} role="dialog" aria-label={`${label}: escolher data`} className={`${popoverPanelClass} p-3`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <button type="button" aria-label="Mês anterior" onClick={() => setFocused(addMonths(focused, -1))} className="grid size-9 place-items-center rounded-full hover:bg-campo">
          <ChevronLeft size={18} strokeWidth={1.8} aria-hidden />
        </button>
        <p aria-live="polite" className="text-[15px] font-semibold">
          {capitalize(monthTitle.format(monthStart))}
        </p>
        <button type="button" aria-label="Próximo mês" onClick={() => setFocused(addMonths(focused, 1))} className="grid size-9 place-items-center rounded-full hover:bg-campo">
          <ChevronRight size={18} strokeWidth={1.8} aria-hidden />
        </button>
      </div>
      <div role="grid" onKeyDown={onGridKey} className="grid grid-cols-7 gap-0.5 text-center">
        {WEEKDAYS.map((day, index) => (
          <span key={index} aria-hidden className="py-1 text-[12px] font-semibold text-tinta-suave">
            {day}
          </span>
        ))}
        {days.map((key) => {
          const inMonth = key.slice(0, 7) === focused.slice(0, 7);
          const isSelected = key === value;
          const isToday = key === today;
          const off = isOff(key);
          return (
            <button
              key={key}
              ref={(element) => {
                if (element) dayRefs.current.set(key, element);
                else dayRefs.current.delete(key);
              }}
              type="button"
              tabIndex={key === focused ? 0 : -1}
              disabled={off}
              aria-label={capitalize(fullDate.format(fromKey(key)))}
              aria-pressed={isSelected}
              onClick={() => pick(key)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  pick(key);
                }
              }}
              className={`grid h-9 place-items-center rounded-full text-sm tabular-nums transition-colors disabled:cursor-not-allowed disabled:text-tinta-suave/35 ${
                isSelected ? "bg-tinta font-semibold text-white" : off ? "" : "hover:bg-campo"
              } ${!isSelected && !inMonth ? "text-tinta-suave/60" : ""} ${!isSelected && isToday ? "ring-1 ring-verde" : ""}`}
            >
              {Number(key.slice(8))}
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between border-t border-linha pt-2">
        <button type="button" onClick={() => pick(today)} disabled={isOff(today)} className="rounded-full px-3 py-1.5 text-sm font-semibold text-verde-tinta hover:bg-campo disabled:opacity-40">
          Hoje
        </button>
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange({ target: { value: "" } });
              setOpen(false);
            }}
            className="rounded-full px-3 py-1.5 text-sm font-semibold text-tinta-suave hover:bg-campo"
          >
            Limpar
          </button>
        )}
      </div>
    </div>
  );

  if (iconOnly) {
    return (
      <span className={className}>
        <button
          ref={(element) => {
            anchorRef.current = element;
          }}
          type="button"
          aria-label={label}
          aria-haspopup="dialog"
          aria-expanded={open}
          disabled={disabled}
          onClick={() => (open ? setOpen(false) : openCalendar())}
          className="grid size-9 place-items-center rounded-full text-tinta-suave transition-colors hover:bg-superficie hover:text-tinta"
        >
          <CalendarDays size={18} strokeWidth={1.8} aria-hidden />
        </button>
        {panelElement}
      </span>
    );
  }

  return (
    <PickerShell id={id} label={label} hint={hint} error={error} className={className}>
      <button
        ref={(element) => {
          anchorRef.current = element;
        }}
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-invalid={error ? true : undefined}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openCalendar())}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" && !open) {
            event.preventDefault();
            openCalendar();
          }
        }}
        className={triggerClass(open, error, !shown)}
      >
        <span className="truncate tabular-nums">
          {shown ? `${pad(shown.getUTCDate())}/${pad(shown.getUTCMonth() + 1)}/${shown.getUTCFullYear()}` : placeholder}
        </span>
        <CalendarDays size={18} strokeWidth={1.8} aria-hidden className="pointer-events-none absolute inset-y-0 right-3 my-auto text-tinta-suave" />
      </button>
      {panelElement}
    </PickerShell>
  );
}

// A month ("AAAA-MM").
export function MonthField({ label, value, onChange, min, max, disabled, error, hint, className, placeholder = "Escolha o mês" }: PickerProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const { anchorRef, popoverRef, style } = useAnchoredPopover(open, close, 300, 296);
  const valid = /^\d{4}-\d{2}$/.test(value);
  const [year, setYear] = useState(() => (valid ? Number(value.slice(0, 4)) : new Date().getFullYear()));
  const isOff = (month: string) => Boolean((min && month < min.slice(0, 7)) || (max && month > max.slice(0, 7)));

  return (
    <PickerShell id={id} label={label} hint={hint} error={error} className={className}>
      <button
        ref={(element) => {
          anchorRef.current = element;
        }}
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => {
          if (!open && valid) setYear(Number(value.slice(0, 4)));
          setOpen(!open);
        }}
        className={triggerClass(open, error, !valid)}
      >
        <span className="truncate">{valid ? capitalize(monthTitle.format(fromKey(`${value}-01`))) : placeholder}</span>
        <CalendarDays size={18} strokeWidth={1.8} aria-hidden className="pointer-events-none absolute inset-y-0 right-3 my-auto text-tinta-suave" />
      </button>
      <div ref={popoverRef} popover="manual" style={style} role="dialog" aria-label={`${label}: escolher mês`} className={`${popoverPanelClass} p-3`}>
        <div className="mb-2 flex items-center justify-between">
          <button type="button" aria-label="Ano anterior" onClick={() => setYear(year - 1)} className="grid size-9 place-items-center rounded-full hover:bg-campo">
            <ChevronLeft size={18} strokeWidth={1.8} aria-hidden />
          </button>
          <p className="text-[15px] font-semibold tabular-nums">{year}</p>
          <button type="button" aria-label="Próximo ano" onClick={() => setYear(year + 1)} className="grid size-9 place-items-center rounded-full hover:bg-campo">
            <ChevronRight size={18} strokeWidth={1.8} aria-hidden />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {Array.from({ length: 12 }, (_, index) => {
            const month = `${year}-${pad(index + 1)}`;
            const isSelected = month === value;
            return (
              <button
                key={month}
                type="button"
                disabled={isOff(month)}
                aria-pressed={isSelected}
                onClick={() => {
                  onChange({ target: { value: month } });
                  setOpen(false);
                  anchorRef.current?.focus();
                }}
                className={`rounded-field py-2.5 text-sm capitalize transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${isSelected ? "bg-tinta font-semibold text-white" : "hover:bg-campo"}`}
              >
                {monthShort.format(fromKey(`${month}-01`)).replace(".", "")}
              </button>
            );
          })}
        </div>
      </div>
    </PickerShell>
  );
}

// A time of day ("HH:mm") from a list every 15 minutes (the value already set is kept if off the grid).
export function TimeField({ label, value, onChange, disabled, error, className, placeholder = "--:--" }: PickerProps) {
  const slots = Array.from({ length: 96 }, (_, index) => `${pad(Math.floor(index / 4))}:${pad((index % 4) * 15)}`);
  if (value && !slots.includes(value)) slots.push(value);
  slots.sort();
  return (
    <SelectField
      label={label}
      className={className}
      value={value}
      onChange={onChange}
      disabled={disabled}
      error={error}
      placeholder={placeholder}
      options={slots.map((slot) => ({ value: slot, label: slot }))}
    />
  );
}

// A date and a time ("AAAA-MM-DDTHH:mm"), as two pickers side by side.
export function DateTimeField({ label, value, onChange, min, max, disabled, error, hint, className }: PickerProps) {
  const [date = "", time = ""] = value ? value.split("T") : [];
  const emit = (nextDate: string, nextTime: string) => onChange({ target: { value: nextDate ? `${nextDate}T${nextTime || "00:00"}` : "" } });
  return (
    <div className={`grid grid-cols-[minmax(0,1fr)_7.5rem] items-start gap-2 ${className ?? ""}`}>
      <DateField label={label} value={date} onChange={(event) => emit(event.target.value, time)} min={min?.slice(0, 10)} max={max?.slice(0, 10)} disabled={disabled} error={error} hint={hint} />
      <TimeField label="Hora" value={time.slice(0, 5)} onChange={(event) => emit(date, event.target.value)} disabled={disabled || !date} className="[&>label]:invisible" />
    </div>
  );
}
