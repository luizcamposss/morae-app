import { useState } from "react";
import type { PainId } from "./landingContent";
import { HeroSection } from "./components/HeroSection";
import { AfterSection, PainsSection } from "./components/StorySections";
import { ChapterReceive } from "./components/ChapterReceive";
import { ChapterNotify } from "./components/ChapterNotify";
import { ChapterDecide } from "./components/ChapterDecide";
import { ChapterCare } from "./components/ChapterCare";
import { ContactSection } from "./components/ContactSection";
import { FaqSection } from "./components/FaqSection";

// Public landing page. The pain picked in the hero follows the visitor down to the contact form.
export function LandingPage() {
  const [pain, setPain] = useState<PainId>("inadimplencia");

  return (
    <div className="min-h-screen bg-superficie text-tinta">
      <main>
        <HeroSection pain={pain} onPainChange={setPain} />
        <PainsSection />
        <ChapterReceive />
        <ChapterNotify />
        <ChapterDecide />
        <ChapterCare />
        <AfterSection />
        <ContactSection pain={pain} />
        <FaqSection />
      </main>

      <footer className="border-t border-linha bg-superficie">
        <div className="mx-auto flex max-w-[1440px] flex-col items-center gap-5 px-4 py-10 sm:flex-row sm:justify-between sm:px-8 lg:px-16">
          <span className="font-display text-[22px] font-bold leading-none text-tinta">Moraê</span>
          <nav aria-label="Rodapé" className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-[15px] font-medium text-tinta">
            {/* Privacy and terms pages come with the contact capture (#105). */}
            <span className="text-tinta-suave">Política de privacidade</span>
            <span className="text-tinta-suave">Termos de uso</span>
            <a href="#contato" className="rounded-sm underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-verde">
              Contato
            </a>
          </nav>
          <p className="text-[14px] text-tinta-suave">© 2026 Moraê</p>
        </div>
      </footer>
    </div>
  );
}
