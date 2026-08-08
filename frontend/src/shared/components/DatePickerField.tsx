import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

type DatePickerFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  placeholder?: string;
  className?: string;
};

const weekDays = ["D", "S", "T", "Q", "Q", "S", "S"];
const monthFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
});
const displayDateFormatter = new Intl.DateTimeFormat("pt-BR");

export function DatePickerField({
  label,
  value,
  onChange,
  min,
  max,
  placeholder = "dd/mm/aaaa",
  className = "",
}: DatePickerFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [calendarStyle, setCalendarStyle] = useState<CSSProperties>({});
  const buttonRef = useRef<HTMLButtonElement>(null);
  const selectedDate = parseInputDate(value);
  const minDate = parseInputDate(min);
  const maxDate = parseInputDate(max);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const baseDate = selectedDate ?? minDate ?? new Date();

    return startOfMonth(baseDate);
  });

  const days = useMemo(() => buildCalendarDays(visibleMonth), [visibleMonth]);
  const formattedValue = selectedDate ? displayDateFormatter.format(selectedDate) : "";

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    updateCalendarPosition();

    window.addEventListener("resize", updateCalendarPosition);
    window.addEventListener("scroll", updateCalendarPosition, true);

    return () => {
      window.removeEventListener("resize", updateCalendarPosition);
      window.removeEventListener("scroll", updateCalendarPosition, true);
    };
  }, [isOpen]);

  function updateCalendarPosition() {
    const button = buttonRef.current;

    if (!button) {
      return;
    }

    const rect = button.getBoundingClientRect();
    const viewportPadding = 16;
    const calendarWidth = Math.min(288, window.innerWidth - viewportPadding * 2);
    const calendarHeight = 336;
    const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
    const shouldOpenUp = spaceBelow < calendarHeight && rect.top > calendarHeight;
    const left = Math.min(
      Math.max(viewportPadding, rect.right - calendarWidth),
      window.innerWidth - calendarWidth - viewportPadding,
    );
    const top = shouldOpenUp
      ? rect.top - calendarHeight - 8
      : rect.bottom + 8;

    setCalendarStyle({
      position: "fixed",
      top,
      left,
      width: calendarWidth,
    });
  }

  function handleSelect(date: Date) {
    if (isDateDisabled(date, minDate, maxDate)) {
      return;
    }

    onChange(formatInputDate(date));
    setIsOpen(false);
  }

  function moveMonth(direction: number) {
    setVisibleMonth((current) => {
      const next = new Date(current);
      next.setMonth(current.getMonth() + direction);

      return startOfMonth(next);
    });
  }

  return (
    <div
      className={`relative ${isOpen ? "z-[120]" : "z-0"} ${className}`}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setIsOpen(false);
        }
      }}
    >
      <span className="mb-2 block text-sm font-extrabold text-[#111827]">{label}</span>

      <button
        ref={buttonRef}
        type="button"
        aria-expanded={isOpen}
        onClick={() => {
          setIsOpen((current) => !current);
          window.requestAnimationFrame(updateCalendarPosition);
        }}
        className={`flex h-12 w-full cursor-pointer items-center justify-between rounded-2xl border bg-white px-4 text-left text-sm font-bold outline-none transition ${
          isOpen
            ? "border-[#22C55E] text-[#111827] ring-4 ring-[#86EFAC]/30"
            : "border-[#E5E7EB] text-[#111827] hover:border-[#BBF7D0]"
        }`}
      >
        <span className={formattedValue ? "text-[#111827]" : "text-[#9CA3AF]"}>
          {formattedValue || placeholder}
        </span>
        <span
          aria-hidden="true"
          className={`ml-3 block size-2 shrink-0 border-r-2 border-b-2 border-current text-[#6B7280] transition-transform ${
            isOpen ? "rotate-[225deg] translate-y-0.5" : "rotate-45 -translate-y-0.5"
          }`}
        />
      </button>

      {isOpen && (
        <div
          style={calendarStyle}
          className="z-[9999] rounded-2xl border border-[#E5E7EB] bg-white p-3 shadow-2xl shadow-[#111827]/20"
        >
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => moveMonth(-1)}
              className="flex size-8 cursor-pointer items-center justify-center rounded-xl border border-[#E5E7EB] text-base font-black text-[#6B7280] transition hover:bg-[#F3F4F6] hover:text-[#111827]"
            >
              ‹
            </button>
            <p className="text-sm font-black capitalize text-[#111827]">
              {monthFormatter.format(visibleMonth)}
            </p>
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => moveMonth(1)}
              className="flex size-8 cursor-pointer items-center justify-center rounded-xl border border-[#E5E7EB] text-base font-black text-[#6B7280] transition hover:bg-[#F3F4F6] hover:text-[#111827]"
            >
              ›
            </button>
          </div>

          <div className="mt-3 grid grid-cols-7 gap-1 text-center">
            {weekDays.map((day, index) => (
              <span
                key={`${day}-${index}`}
                className="py-1 text-xs font-black text-[#9CA3AF]"
              >
                {day}
              </span>
            ))}

            {days.map((date) => {
              const isCurrentMonth = date.getMonth() === visibleMonth.getMonth();
              const isSelected = selectedDate && isSameDate(date, selectedDate);
              const isToday = isSameDate(date, new Date());
              const isDisabled = isDateDisabled(date, minDate, maxDate);

              return (
                <button
                  key={formatInputDate(date)}
                  type="button"
                  disabled={isDisabled}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => handleSelect(date)}
                  className={`flex size-8 cursor-pointer items-center justify-center rounded-lg text-xs font-black transition disabled:cursor-not-allowed ${
                    isSelected
                      ? "bg-[#16A34A] text-white shadow-sm shadow-[#16A34A]/30"
                      : isToday
                        ? "bg-[#DCFCE7] text-[#0B3D2E]"
                        : isCurrentMonth
                          ? "text-[#111827] hover:bg-[#F0FDF4] hover:text-[#0B3D2E]"
                          : "text-[#D1D5DB] hover:bg-[#F9FAFB]"
                  } ${isDisabled ? "bg-transparent text-[#D1D5DB] opacity-60 hover:bg-transparent" : ""}`}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-[#E5E7EB] pt-3">
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onChange("")}
              className="cursor-pointer text-xs font-black text-[#6B7280] transition hover:text-[#B42318]"
            >
              Limpar
            </button>
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                const today = new Date();
                setVisibleMonth(startOfMonth(today));
                handleSelect(today);
              }}
              disabled={isDateDisabled(new Date(), minDate, maxDate)}
              className="cursor-pointer text-xs font-black text-[#16A34A] transition hover:text-[#0B3D2E] disabled:cursor-not-allowed disabled:text-[#D1D5DB]"
            >
              Hoje
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function buildCalendarDays(month: Date) {
  const firstDay = startOfMonth(month);
  const firstVisibleDate = new Date(firstDay);
  firstVisibleDate.setDate(firstDay.getDate() - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(firstVisibleDate);
    date.setDate(firstVisibleDate.getDate() + index);

    return date;
  });
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function parseInputDate(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);

  return new Date(year, month - 1, day);
}

function formatInputDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function isSameDate(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function isDateDisabled(date: Date, minDate: Date | null, maxDate: Date | null) {
  if (minDate && date < minDate) {
    return true;
  }

  if (maxDate && date > maxDate) {
    return true;
  }

  return false;
}
