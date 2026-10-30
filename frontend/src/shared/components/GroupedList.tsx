import type { ReactNode } from "react";
import { ChevronRight, type LucideIcon } from "lucide-react";

// iPhone-Settings-style list (DESIGN.md → Grouped List): a title over a white card of rows.
export function GroupedList({ title, footer, children }: { title?: string; footer?: ReactNode; children: ReactNode }) {
  return (
    <section>
      {title && <h2 className="mb-2 px-1 text-[13px] font-semibold text-tinta-suave">{title}</h2>}
      <ul className="divide-y divide-linha overflow-hidden rounded-card bg-superficie shadow-whisper">{children}</ul>
      {footer && <div className="mt-2 px-1 text-[13px] text-tinta-suave">{footer}</div>}
    </section>
  );
}

const tileTones = {
  green: "bg-verde-suave text-verde-tinta",
  amber: "bg-ambar-suave text-ambar",
  red: "bg-vermelho-suave text-vermelho",
  neutral: "bg-campo text-tinta-suave",
};

type GroupedRowProps = {
  icon: LucideIcon;
  tone?: keyof typeof tileTones;
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  onClick?: () => void;
};

export function GroupedRow({ icon: Icon, tone = "neutral", title, subtitle, trailing, onClick }: GroupedRowProps) {
  const content = (
    <>
      <span aria-hidden className={`grid size-9 shrink-0 place-items-center rounded-[9px] ${tileTones[tone]}`}>
        <Icon size={18} strokeWidth={1.7} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold text-tinta">{title}</span>
        {subtitle && <span className="block truncate text-[13px] text-tinta-suave">{subtitle}</span>}
      </span>
      {trailing}
      {onClick && <ChevronRight size={18} strokeWidth={1.8} aria-hidden className="shrink-0 text-tinta-suave" />}
    </>
  );

  return (
    <li>
      {onClick ? (
        <button type="button" onClick={onClick} className="flex w-full items-center gap-3.5 px-5 py-3.5 text-left transition-colors hover:bg-campo/60">
          {content}
        </button>
      ) : (
        <div className="flex items-center gap-3.5 px-5 py-3.5">{content}</div>
      )}
    </li>
  );
}
