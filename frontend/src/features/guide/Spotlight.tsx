import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "../../shared/components/Button";

const PAD = 6;
const GAP = 14;
const EDGE = 16;

type SpotlightProps = {
  // The element in focus; null = no element (a centered message).
  target: HTMLElement | null;
  title: string;
  body: string;
  index: number;
  total: number;
  onNext: () => void;
  onBack: () => void;
  onClose: () => void;
};

type Box = { top: number; left: number; width: number; height: number };

// The tutorial's look: the screen goes dark, a cut-out keeps the element in focus, and a short
// balloon explains it. Clicks outside the balloon do nothing, so the tour is never lost halfway.
export function Spotlight({ target, title, body, index, total, onNext, onBack, onClose }: SpotlightProps) {
  const titleId = useId();
  const balloonRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const [hole, setHole] = useState<Box | null>(null);
  const [balloonStyle, setBalloonStyle] = useState<CSSProperties>({ visibility: "hidden" });
  const isLast = index === total - 1;

  const place = useCallback(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const balloon = balloonRef.current;
    const width = Math.min(360, vw - EDGE * 2);
    const height = balloon?.offsetHeight ?? 220;

    if (!target) {
      setHole(null);
      setBalloonStyle({ width, left: (vw - width) / 2, top: Math.max(EDGE, (vh - height) / 2) });
      return;
    }

    const rect = target.getBoundingClientRect();
    const box = { top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 };
    setHole(box);

    // Side menu on a wide screen: the balloon goes to its right.
    if (rect.left < vw * 0.25 && box.left + box.width + GAP + width + EDGE <= vw && vw >= 1024) {
      const top = Math.min(Math.max(EDGE, rect.top + rect.height / 2 - height / 2), vh - height - EDGE);
      setBalloonStyle({ width, left: box.left + box.width + GAP, top });
      return;
    }

    const left = Math.min(Math.max(EDGE, rect.left + rect.width / 2 - width / 2), vw - width - EDGE);
    const below = vh - (box.top + box.height) - GAP - EDGE;
    const above = box.top - GAP - EDGE;
    const top = below >= height || below >= above ? Math.min(box.top + box.height + GAP, vh - height - EDGE) : Math.max(EDGE, box.top - GAP - height);
    setBalloonStyle({ width, left, top });
  }, [target]);

  // Brings the element into view, then measures (the balloon needs its own height first).
  useLayoutEffect(() => {
    target?.scrollIntoView({ block: "center", inline: "nearest" });
    const frame = requestAnimationFrame(place);
    return () => cancelAnimationFrame(frame);
  }, [place, target, title, body]);

  useEffect(() => {
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [place]);

  useEffect(() => {
    nextRef.current?.focus({ preventScroll: true });
  }, [index]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        onNext();
      } else if (event.key === "ArrowLeft" && index > 0) {
        event.preventDefault();
        onBack();
      } else if (event.key === "Tab") {
        // Focus stays inside the balloon.
        const buttons = Array.from(balloonRef.current?.querySelectorAll<HTMLButtonElement>("button") ?? []);
        if (!buttons.length) return;
        const position = buttons.indexOf(document.activeElement as HTMLButtonElement);
        const nextIndex = event.shiftKey ? (position <= 0 ? buttons.length - 1 : position - 1) : (position + 1) % buttons.length;
        event.preventDefault();
        buttons[nextIndex].focus();
      }
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [index, onBack, onClose, onNext]);

  return createPortal(
    <div className="fixed inset-0 z-[80]" data-guide>
      {/* Catches every click outside the balloon. */}
      <div className="absolute inset-0" aria-hidden onClick={(event) => event.stopPropagation()} />

      <div
        aria-hidden
        className="pointer-events-none fixed rounded-[14px] shadow-[0_0_0_9999px_rgb(5_26_26/0.58)] ring-2 ring-verde/80 motion-safe:transition-[top,left,width,height] motion-safe:duration-300 motion-safe:ease-out"
        style={hole ?? { top: "50%", left: "50%", width: 0, height: 0 }}
      />

      <div
        ref={balloonRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="fixed rounded-block bg-superficie p-5 text-tinta shadow-window motion-safe:transition-[top,left] motion-safe:duration-300 motion-safe:ease-out"
        style={balloonStyle}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-semibold tabular-nums text-tinta-suave">
            {index + 1} de {total}
          </p>
          <button type="button" onClick={onClose} aria-label="Fechar o tutorial" className="-m-1.5 rounded-full p-1.5 text-tinta-suave hover:bg-campo hover:text-tinta">
            <X size={16} strokeWidth={2} aria-hidden />
          </button>
        </div>
        <h2 id={titleId} className="mt-1 text-[17px] font-semibold leading-snug text-tinta-forte">
          {title}
        </h2>
        <p aria-live="polite" className="mt-1.5 text-[15px] leading-relaxed text-tinta-suave">
          {body}
        </p>

        <div aria-hidden className="mt-4 flex gap-1">
          {Array.from({ length: total }, (_, item) => (
            <span key={item} className={`h-1 flex-1 rounded-full ${item <= index ? "bg-verde" : "bg-linha"}`} />
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <button type="button" onClick={onClose} className="rounded-full px-1 py-2 text-sm font-semibold text-tinta-suave hover:text-tinta">
            {isLast ? "Fechar" : "Pular"}
          </button>
          <div className="flex gap-2">
            {index > 0 && (
              <Button variant="quiet" size="sm" onClick={onBack}>
                Voltar
              </Button>
            )}
            <Button ref={nextRef} size="sm" onClick={onNext}>
              {isLast ? "Concluir" : "Próximo"}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
