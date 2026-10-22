import { Check } from "lucide-react";
import { Chapter, SceneHalo } from "./Chapter";

const RESIDENTS = 24;

export function ChapterNotify() {
  return (
    <Chapter
      id="avisar"
      number="02"
      reversed
      textWidth={420}
      title={<>Todo aviso chega, e <span className="text-verde">fica registrado</span>.</>}
      text="Chega para quem precisa, na hora, e fica guardado para consultar depois."
    >
      <div className="relative mx-auto w-full max-w-[460px] py-6 lg:py-10">
        <SceneHalo className="-inset-x-48 -inset-y-24" />
        {/* The notice board behind: older notices stay on record. */}
        <div aria-hidden className="absolute inset-y-6 left-0 right-0 translate-x-2 -translate-y-4 rotate-2 sm:translate-x-[30px] sm:-translate-y-[34px] sm:rotate-3 rounded-card border border-linha bg-superficie/55 shadow-whisper lg:inset-y-10" />
        <div aria-hidden className="absolute inset-y-6 left-0 right-0 translate-x-1 -translate-y-2 rotate-1 sm:translate-x-4 sm:-translate-y-[18px] sm:rotate-[1.5deg] rounded-card border border-linha bg-superficie/80 shadow-whisper lg:inset-y-10" />

        <article className="relative flex flex-col gap-5 rounded-card bg-superficie px-6 pb-7 pt-7 shadow-[0_24px_56px_-6px_rgb(5_26_26/0.16)] sm:px-8 sm:pt-8">
          <div className="flex items-center justify-between gap-3">
            <span className="rounded-chip bg-verde-suave px-2.5 py-1 text-[12px] font-semibold tracking-[0.08em] text-verde-tinta">AVISO · TORRE B</span>
            <span className="text-[13px] font-medium text-tinta-suave">Hoje, 09:12</span>
          </div>
          <h3 className="font-display text-[clamp(2rem,4vw,2.625rem)] font-bold leading-[1.04] tracking-[-0.02em] text-tinta">
            Falta d’água sábado, 9h às 13h.
          </h3>
          <p className="text-[17px] leading-[1.45] text-tinta-suave">
            A concessionária fará manutenção na rede. Guarde água na sexta à noite.
          </p>
          <div className="h-px bg-linha" />
          <ul className="flex flex-wrap gap-1.5" aria-label={`${RESIDENTS} moradores avisados`}>
            {Array.from({ length: RESIDENTS }, (_, index) => (
              <li key={index} className="grid size-[26px] place-items-center rounded-[7px] bg-verde-suave text-verde">
                <Check size={12} strokeWidth={3} aria-hidden />
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-0.5">
            <p className="text-[16px] font-semibold text-verde-tinta">24 de 24 moradores avisados</p>
            <p className="text-[14px] text-tinta-suave">No app e no sininho · fica no mural do condomínio</p>
          </div>
        </article>
      </div>
    </Chapter>
  );
}
