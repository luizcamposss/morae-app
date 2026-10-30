import type { ReactNode } from "react";
import { MoraeMark } from "../../shared/components/MoraeMark";

type AuthLayoutProps = {
  children: ReactNode;
  // Brand panel on the right (desktop only), one per screen: see authPanels.tsx.
  panel: ReactNode;
};

// Shared shell of the access screens (login, password, invitation, paused access):
// the form on the left and a brand panel on the right (desktop only).
export function AuthLayout({ children, panel }: AuthLayoutProps) {
  return (
    <main className="min-h-svh bg-superficie lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,760px)] lg:gap-5 lg:p-5">
      <div className="flex min-h-svh flex-col px-6 py-10 sm:px-10 lg:min-h-0 lg:justify-center lg:px-[140px] lg:py-0">
        <div className="mx-auto w-full max-w-[400px] lg:mx-0">
          <MoraeMark withName size={28} />
          <div className="mt-10 lg:mt-14">{children}</div>
        </div>
      </div>

      <aside aria-hidden className="hidden flex-col justify-center rounded-card bg-verde-suave/60 px-20 lg:flex">
        {panel}
      </aside>
    </main>
  );
}
