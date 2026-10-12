import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { MoraeMark } from "../../shared/components/MoraeMark";

type AuthLayoutProps = {
  children: ReactNode;
};

// Shared shell of the access screens (login, password, invitation, paused access):
// the form on the left and the brand panel on the right (desktop only).
export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <main className="min-h-svh bg-superficie lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,760px)] lg:gap-5 lg:p-5">
      <div className="flex min-h-svh flex-col px-6 py-10 sm:px-10 lg:min-h-0 lg:justify-center lg:px-[140px] lg:py-0">
        <div className="mx-auto w-full max-w-[400px] lg:mx-0">
          <MoraeMark withName size={28} />
          <div className="mt-10 lg:mt-14">{children}</div>
        </div>
      </div>

      <BrandPanel />
    </main>
  );
}

function BrandPanel() {
  return (
    <aside
      aria-hidden
      className="hidden flex-col justify-center rounded-card bg-verde-suave/60 px-20 lg:flex"
    >
      <p className="max-w-[560px] font-display text-[40px] font-bold leading-[1.08] tracking-[-0.015em] text-tinta">
        O condomínio inteiro, <span className="text-verde">em dia</span>, unidade por unidade.
      </p>

      <div className="relative mt-10 max-w-[600px]">
        <div className="rounded-card bg-superficie p-6 shadow-float">
          <div className="flex items-baseline justify-between text-sm text-tinta-suave">
            <span>Residencial Jardins · Outubro</span>
            <span className="text-xs">exemplo</span>
          </div>
          <p className="mt-4 font-display text-[30px] font-bold leading-none tracking-[-0.015em] text-tinta tabular-nums">
            53 de 60 em dia
          </p>
          <div className="mt-5 flex h-2 gap-1">
            <span className="flex-[53] rounded-full bg-verde" />
            <span className="flex-[4] rounded-full bg-ambar" />
            <span className="flex-[3] rounded-full bg-vermelho" />
          </div>
        </div>

        <div className="absolute -right-6 -top-8 flex items-center gap-3 rounded-block bg-superficie py-3 pl-3 pr-5 shadow-float">
          <span className="grid size-9 place-items-center rounded-[9px] bg-verde text-superficie">
            <Check size={18} strokeWidth={2.2} />
          </span>
          <span>
            <span className="block text-sm font-semibold text-tinta">Pix recebido · Apto 302</span>
            <span className="block text-xs text-tinta-suave">Baixa automática · agora</span>
          </span>
        </div>
      </div>
    </aside>
  );
}
