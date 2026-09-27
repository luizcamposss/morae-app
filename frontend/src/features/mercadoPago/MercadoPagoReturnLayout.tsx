import type { ReactNode } from "react";

type Tone = "loading" | "success" | "warning" | "error";

type MercadoPagoReturnLayoutProps = {
  title: string;
  description: string;
  tone: Tone;
  actionLabel?: string;
  onAction?: () => void;
  children?: ReactNode;
};

const toneStyles: Record<Tone, string> = {
  loading: "border-[#E5E7EB] bg-[#F9FAFB] text-[#4B5563]",
  success: "border-[#BBF7D0] bg-[#ECFDF5] text-[#065F46]",
  warning: "border-[#FDE68A] bg-[#FFFBEB] text-[#92400E]",
  error: "border-[#FECACA] bg-[#FDECEC] text-[#B42318]",
};

export function MercadoPagoReturnLayout({
  title,
  description,
  tone,
  actionLabel,
  onAction,
  children,
}: MercadoPagoReturnLayoutProps) {
  return (
    <main className="min-h-screen bg-[#F3F4F6] px-5 py-8 text-[#111827]">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-xl items-center">
        <div className="w-full overflow-hidden rounded-[2rem] border border-[#E5E7EB] bg-white shadow-xl shadow-[#0B3D2E]/10">
          <div className="bg-[#0B3D2E] px-6 py-8 text-white">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#86EFAC]">
              MORAÊ · Mercado Pago
            </p>
            <h1 className="mt-4 text-3xl font-black tracking-tight">{title}</h1>
          </div>

          <div className="space-y-5 px-6 py-6">
            <div
              role={tone === "error" ? "alert" : "status"}
              className={`rounded-3xl border p-5 text-sm font-bold leading-6 ${toneStyles[tone]}`}
            >
              {description}
            </div>

            {children}

            {actionLabel && onAction && (
              <button
                type="button"
                onClick={onAction}
                className="h-12 w-full cursor-pointer rounded-2xl bg-[#16A34A] text-sm font-extrabold text-white shadow-lg shadow-[#16A34A]/20 transition hover:bg-[#0B3D2E]"
              >
                {actionLabel}
              </button>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
