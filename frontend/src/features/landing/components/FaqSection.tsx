import { useId, useState } from "react";
import { ArrowRight, Minus, Plus } from "lucide-react";
import { useCommercialWhatsApp, whatsappLink } from "../../../shared/hooks/useCommercialWhatsApp";
import { faqItems, GREETING_MESSAGE } from "../landingContent";

export function FaqSection() {
  // The first answer starts open, as in the design.
  const [openItems, setOpenItems] = useState<Set<number>>(() => new Set([0]));
  const baseId = useId();
  const whatsAppNumber = useCommercialWhatsApp();

  function toggle(index: number) {
    setOpenItems((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  return (
    <section id="duvidas" className="bg-superficie">
      <div className="mx-auto grid max-w-[1440px] gap-12 px-4 py-20 sm:px-8 lg:grid-cols-[420px_1fr] lg:gap-20 lg:px-16 lg:py-[120px]">
        <div className="flex flex-col gap-4">
          <p className="text-[14px] font-semibold tracking-[0.1em] text-verde">PERGUNTAS FREQUENTES</p>
          <h2 className="font-display text-[clamp(2.25rem,3.6vw,2.75rem)] font-bold leading-[1.05] tracking-[-0.02em] text-tinta max-lg:text-balance">
            As dúvidas de quem está pensando em trocar.
          </h2>
          {/* Only when the commercial WhatsApp is configured: the whole card is about it. */}
          {whatsAppNumber && (
            <div className="mt-6 flex max-w-[400px] flex-col items-start gap-1.5 rounded-2xl bg-fundo p-[22px] motion-safe:animate-rise-in">
              <p className="text-[17px] font-semibold text-tinta">Não achou sua dúvida?</p>
              <p className="text-[15px] text-tinta-suave">A gente responde rápido no WhatsApp.</p>
              <a
                href={whatsappLink(whatsAppNumber, GREETING_MESSAGE)}
                target="_blank"
                rel="noreferrer"
                className="group mt-3 inline-flex items-center gap-2 rounded-full bg-verde px-5 py-3 text-[15px] font-semibold text-verde-tinta transition-colors duration-150 hover:bg-verde-forte focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-verde"
              >
                Chamar no WhatsApp
                <ArrowRight size={17} strokeWidth={2.4} aria-hidden className="transition-transform duration-200 ease-out-expo group-hover:translate-x-0.5" />
              </a>
            </div>
          )}
        </div>

        <ul className="border-t border-linha">
          {faqItems.map((item, index) => {
            const open = openItems.has(index);
            const panelId = `${baseId}-${index}`;
            return (
              <li key={item.question} className="border-b border-linha">
                <h3>
                  <button
                    type="button"
                    aria-expanded={open}
                    aria-controls={panelId}
                    onClick={() => toggle(index)}
                    className="flex w-full items-center justify-between gap-6 py-6 text-left text-[clamp(1.0625rem,1.6vw,1.25rem)] font-semibold text-tinta transition-colors duration-150 hover:text-tinta-forte focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-verde"
                  >
                    {item.question}
                    {open ? (
                      <Minus size={20} className="shrink-0 text-verde" aria-hidden />
                    ) : (
                      <Plus size={20} className="shrink-0 text-verde" aria-hidden />
                    )}
                  </button>
                </h3>
                <div
                  id={panelId}
                  className={`grid transition-[grid-template-rows] duration-300 ease-out-expo ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
                >
                  <p className={`overflow-hidden text-[17px] leading-[1.55] text-tinta-suave ${open ? "" : "invisible"}`}>
                    <span className="block max-w-[70ch] pb-6">{item.answer}</span>
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
