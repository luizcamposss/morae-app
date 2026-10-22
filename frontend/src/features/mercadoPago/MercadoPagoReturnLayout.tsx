import { CircleAlert, CircleCheck } from "lucide-react";
import { Button } from "../../shared/components/Button";
import { MoraeMark } from "../../shared/components/MoraeMark";

type Tone = "loading" | "success" | "error";

type MercadoPagoReturnLayoutProps = {
  title: string;
  description: string;
  tone: Tone;
  actionLabel?: string;
  onAction?: () => void;
};

// Standalone page shown when Mercado Pago sends the browser back after the OAuth authorization.
export function MercadoPagoReturnLayout({ title, description, tone, actionLabel, onAction }: MercadoPagoReturnLayoutProps) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-fundo px-4 py-10 text-tinta">
      {/* While connecting, the logo itself breathes (the loading state). */}
      <MoraeMark size={30} withName motion={tone === "loading" ? "respiro" : "static"} />

      <section className="mt-8 w-full max-w-md rounded-card bg-superficie px-6 py-8 text-center shadow-whisper sm:px-8">
        {tone !== "loading" && (
          <span
            aria-hidden
            className={`mx-auto mb-5 grid size-14 place-items-center rounded-full ${
              tone === "success" ? "bg-verde-suave text-verde-tinta" : "bg-vermelho-suave text-vermelho"
            }`}
          >
            {tone === "success" ? <CircleCheck size={26} strokeWidth={1.8} /> : <CircleAlert size={26} strokeWidth={1.8} />}
          </span>
        )}

        <h1 className="font-display text-[26px] font-bold leading-[1.15] tracking-[-0.01em] [text-wrap:balance]">{title}</h1>
        <p role={tone === "error" ? "alert" : "status"} className="mx-auto mt-2 max-w-sm text-[15px] text-tinta-suave [text-wrap:pretty]">
          {description}
        </p>

        {actionLabel && onAction && (
          <Button fullWidth onClick={onAction} className="mt-7">
            {actionLabel}
          </Button>
        )}
      </section>
    </main>
  );
}
