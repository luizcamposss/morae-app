import { ChevronLeft, ChevronRight } from "lucide-react";
import { monthLabel, shiftMonth } from "./expenseMeta";

type MonthNavigatorProps = {
  month: string;
  // Latest month that can be opened (the current one): there is nothing paid in the future.
  maxMonth: string;
  onChange: (month: string) => void;
};

// "‹ novembro de 2026 ›" used by the expenses and balance screens.
export function MonthNavigator({ month, maxMonth, onChange }: MonthNavigatorProps) {
  const isLatest = month >= maxMonth;
  const buttonClass =
    "grid size-10 place-items-center rounded-full text-tinta transition-colors hover:bg-menu disabled:cursor-not-allowed disabled:text-tinta-suave/50 disabled:hover:bg-transparent";

  return (
    <div className="flex items-center justify-between gap-2 rounded-block bg-superficie p-1 shadow-whisper sm:inline-flex sm:justify-start">
      <button type="button" onClick={() => onChange(shiftMonth(month, -1))} aria-label="Mês anterior" className={buttonClass}>
        <ChevronLeft size={20} strokeWidth={1.8} aria-hidden />
      </button>
      <p aria-live="polite" className="min-w-40 text-center text-[15px] font-semibold text-tinta first-letter:uppercase">
        {monthLabel(month)}
      </p>
      <button type="button" onClick={() => onChange(shiftMonth(month, 1))} disabled={isLatest} aria-label="Próximo mês" className={buttonClass}>
        <ChevronRight size={20} strokeWidth={1.8} aria-hidden />
      </button>
    </div>
  );
}
