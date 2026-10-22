import { Check, type LucideIcon } from "lucide-react";

export type NoteTone = "verde" | "ambar" | "vermelho" | "neutro";

const toneClasses: Record<NoteTone, { tile: string; number: string }> = {
  verde: { tile: "bg-verde-suave text-verde", number: "text-verde" },
  ambar: { tile: "bg-ambar-suave text-ambar", number: "text-ambar" },
  vermelho: { tile: "bg-vermelho-suave text-vermelho", number: "text-vermelho" },
  neutro: { tile: "bg-campo text-tinta", number: "text-tinta-suave" },
};

type NoteCardProps = {
  icon: LucideIcon;
  tone: NoteTone;
  title: string;
  detail: string;
  number?: string;
  compact?: boolean;
  className?: string;
};

// Floating notification card with an icon square, as in the app's notifications.
export function NoteCard({ icon: Icon, tone, title, detail, number, compact = false, className = "" }: NoteCardProps) {
  const colors = toneClasses[tone];

  return (
    <div className={`flex items-center gap-3 rounded-block bg-superficie py-3 pl-3.5 pr-[18px] shadow-[0_14px_34px_-8px_rgb(15_61_62/0.12)] ${className}`}>
      <span className={`grid size-[38px] shrink-0 place-items-center rounded-[10px] ${colors.tile}`}>
        <Icon size={20} strokeWidth={2} aria-hidden />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className={`flex items-center gap-1.5 font-semibold leading-tight text-tinta ${compact ? "text-[14px]" : "text-[15px]"}`}>
          {number && <span className={`font-display text-[13px] font-bold ${colors.number}`}>{number}</span>}
          {title}
        </span>
        <span className={`leading-snug text-tinta-suave ${compact ? "text-[12px]" : "text-[13px]"}`}>{detail}</span>
      </span>
    </div>
  );
}

type PixToastProps = { unit: string; className?: string };

// "Pix recebido" toast: the moment the payment is settled on its own.
export function PixToast({ unit, className = "" }: PixToastProps) {
  return (
    <div className={`flex w-[296px] items-center gap-3 rounded-block bg-superficie px-4 py-3.5 shadow-float ring-1 ring-linha/70 ${className}`}>
      <span className="grid size-9 shrink-0 place-items-center rounded-[9px] bg-verde text-white">
        <Check size={20} strokeWidth={2.6} aria-hidden />
      </span>
      <span className="flex flex-col">
        <span className="text-[15px] font-semibold leading-tight text-tinta">Pix recebido · Apto {unit}</span>
        <span className="text-[13px] leading-snug text-tinta-suave">R$ 650,00 · baixa automática · agora</span>
      </span>
    </div>
  );
}
