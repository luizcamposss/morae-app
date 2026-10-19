import type { CSSProperties, ReactNode } from "react";

type ChapterProps = {
  id: string;
  number: string;
  title: ReactNode;
  text: string;
  // Scene on the left and text on the right (the chapters alternate sides).
  reversed?: boolean;
  textWidth: 420 | 524;
  // The first chapter opens with a slightly larger title.
  largeTitle?: boolean;
  details?: ReactNode;
  children: ReactNode;
};

// One chapter of the product story: number, title, one sentence and a real product scene.
export function Chapter({ id, number, title, text, reversed = false, textWidth, largeTitle = false, details, children }: ChapterProps) {
  return (
    <section id={id} className="scroll-mt-6 overflow-x-clip bg-superficie">
      <div
        className={`mx-auto flex max-w-[1440px] flex-col gap-12 px-4 py-20 sm:px-8 lg:items-center lg:gap-12 lg:px-16 lg:py-24 ${reversed ? "lg:flex-row-reverse" : "lg:flex-row"}`}
      >
        <div className="flex w-full shrink-0 flex-col gap-6 lg:w-[var(--text-width)]" style={{ "--text-width": `${textWidth}px` } as CSSProperties}>
          <p aria-hidden className="font-display text-[56px] font-bold leading-none text-[#c9d2c6]">{number}</p>
          <h2 className={`font-display font-bold ${largeTitle ? "text-[clamp(2.25rem,4.4vw,3.125rem)]" : "text-[clamp(2.25rem,4vw,2.875rem)]"} leading-[1.04] tracking-[-0.02em] text-balance text-tinta`}>
            {title}
          </h2>
          <p className="max-w-[460px] text-[19px] leading-normal text-pretty text-tinta-suave">{text}</p>
          {details}
        </div>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </section>
  );
}

// Soft halo behind a scene, the same light used in the building sections.
export function SceneHalo({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute rounded-full bg-[radial-gradient(closest-side,rgb(237_240_234)_0%,rgb(237_240_234/0.6)_60%,transparent_100%)] ${className}`}
    />
  );
}
