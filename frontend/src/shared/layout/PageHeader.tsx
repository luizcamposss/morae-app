import type { ReactNode } from "react";
import { HeaderActions } from "./HeaderActions";

type PageHeaderProps = {
  title: string;
  // Small line above the title, e.g. today's date.
  overline?: string;
  children?: ReactNode;
};

// Title of a redesigned screen, on the same line as the bell and the avatar (desktop).
export function PageHeader({ title, overline, children }: PageHeaderProps) {
  return (
    <header data-page-header className="mb-8 flex items-end justify-between gap-6">
      <div className="min-w-0">
        {overline && <p className="text-[13px] text-tinta-suave first-letter:uppercase">{overline}</p>}
        <h1 data-tour="page:title" className="mt-1 font-display text-[32px] font-bold leading-[1.08] tracking-[-0.015em] text-tinta lg:text-[38px]">
          {title}
        </h1>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {children && (
          <div data-tour="page:action" className="flex items-center gap-3">
            {children}
          </div>
        )}
        <div className="hidden lg:block">
          <HeaderActions />
        </div>
      </div>
    </header>
  );
}
