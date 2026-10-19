import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { MoraeMark } from "../../../shared/components/MoraeMark";
import { pains, type PainId } from "../landingContent";
import { GREETING_LINK } from "../whatsapp";
import { PainSelector } from "./PainSelector";
import { PixToast } from "./NoteCard";
import { UnitGridPanel } from "./UnitGridPanel";

type HeroSectionProps = { pain: PainId; onPainChange: (pain: PainId) => void };

const TAGLINE = "SISTEMA DE GESTÃO PARA CONDOMÍNIOS E ADMINISTRADORAS";

export function HeroSection({ pain, onPainChange }: HeroSectionProps) {
  const { headline, subtitle } = pains.find((item) => item.id === pain) ?? pains[0];

  return (
    <section className="relative overflow-hidden bg-superficie lg:h-[900px]">
      <nav className="relative z-10 mx-auto flex h-[72px] max-w-[1440px] items-center justify-between px-4 sm:px-8 lg:h-[88px] lg:px-16">
        <Link to="/" aria-label="Moraê, início" className="inline-flex items-center gap-2 rounded-field focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-verde">
          <MoraeMark size={32} />
          <span className="font-display text-[24px] font-bold leading-none tracking-[-0.01em] text-tinta">Moraê</span>
        </Link>
        <p className="absolute left-1/2 hidden -translate-x-1/2 text-[14px] font-semibold tracking-[0.1em] text-verde xl:block">{TAGLINE}</p>
        <Link
          to="/login"
          className="rounded-full px-3 py-2 text-[16px] font-semibold text-tinta transition-colors duration-150 hover:bg-campo focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-verde"
        >
          Entrar
        </Link>
      </nav>

      <div className="mx-auto flex max-w-[1000px] flex-col items-center px-4 pt-6 text-center lg:pt-6">
        <p className="mb-5 text-[12px] font-semibold tracking-[0.1em] text-verde xl:hidden">{TAGLINE}</p>
        <p className="text-[clamp(1.125rem,2.2vw,1.625rem)] font-semibold text-tinta-suave">
          Hoje, o que mais me tira o sono é <PainSelector value={pain} onChange={onPainChange} />
        </p>

        <h1
          key={pain}
          className="mt-6 max-w-[960px] animate-rise-in font-display text-[clamp(2.75rem,6.6vw,5.25rem)] font-bold leading-[0.98] tracking-[-0.03em] text-tinta max-lg:text-balance"
        >
          {headline.before}
          <span className="text-verde">{headline.highlight}</span>
          {headline.after}
        </h1>
        <p className="mt-6 max-w-[680px] text-[clamp(1.0625rem,1.6vw,1.3125rem)] leading-normal text-pretty text-tinta-suave">{subtitle}</p>

        <div className="mt-6 flex flex-col items-center gap-x-6 gap-y-4 sm:flex-row">
          <a
            href="#contato"
            className="group inline-flex h-[59px] items-center gap-3 rounded-full bg-verde px-7 text-[18px] font-bold text-verde-tinta transition-colors duration-150 hover:bg-verde-forte focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-verde"
          >
            Ver o Moraê funcionando
            <ArrowRight size={20} strokeWidth={2.4} aria-hidden className="transition-transform duration-200 ease-out-expo group-hover:translate-x-1" />
          </a>
          <a
            href={GREETING_LINK}
            target="_blank"
            rel="noreferrer"
            className="text-[17px] font-semibold text-tinta underline decoration-tinta/40 underline-offset-4 transition-colors hover:decoration-tinta focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-verde"
          >
            ou fale no WhatsApp
          </a>
        </div>
      </div>

      {/* Product panel cut at the fold, with the payment that just settled. */}
      <div className="relative mx-auto mt-16 max-w-[640px] px-4 lg:absolute lg:left-1/2 lg:top-[600px] lg:mt-0 lg:w-[1100px] lg:max-w-none lg:-translate-x-1/2 lg:px-0">
        <div className="h-[250px] overflow-hidden sm:h-[290px] lg:h-auto lg:overflow-visible">
          <UnitGridPanel variant="wide" title="Cobranças · Outubro · Torre A" selectedUnit="302" className="hidden lg:block" />
          <UnitGridPanel variant="compact" title="Cobranças · Outubro · Torre A" selectedUnit="302" className="lg:hidden" />
        </div>
        <PixToast
          unit="302"
          className="absolute -top-10 right-2 motion-safe:animate-[rise-in_0.8s_cubic-bezier(0.16,1,0.3,1)_0.9s_both] sm:right-4 lg:-right-[66px]"
        />
      </div>
    </section>
  );
}
