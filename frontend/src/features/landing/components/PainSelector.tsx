import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Check, ChevronDown } from "lucide-react";
import { pains, type PainId } from "../landingContent";

type PainSelectorProps = { value: PainId; onChange: (pain: PainId) => void };

// "Hoje, o que mais me tira o sono é ___": picks the pain that drives the hero and the contact message.
export function PainSelector({ value, onChange }: PainSelectorProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const listId = useId();
  const current = pains.find((pain) => pain.id === value) ?? pains[0];

  useEffect(() => {
    if (!open) return;
    optionRefs.current[pains.findIndex((pain) => pain.id === value)]?.focus();

    const closeOnOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutside);
    return () => document.removeEventListener("pointerdown", closeOnOutside);
  }, [open, value]);

  function moveFocus(event: KeyboardEvent<HTMLUListElement>) {
    const index = optionRefs.current.findIndex((option) => option === document.activeElement);
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      optionRefs.current[(index + step + pains.length) % pains.length]?.focus();
    }
    if (event.key === "Escape" || event.key === "Tab") setOpen(false);
  }

  function choose(pain: PainId) {
    onChange(pain);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative inline-block">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((isOpen) => !isOpen)}
        className="relative inline-flex items-center gap-1.5 pb-1 font-bold text-verde transition-colors duration-150 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-current hover:text-verde-forte focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-verde"
      >
        {current.selectorLabel}
        <ChevronDown
          size={18}
          strokeWidth={2.6}
          aria-hidden
          className={`transition-transform duration-200 ease-out-expo ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label="O que mais te tira o sono no condomínio"
          onKeyDown={moveFocus}
          className="absolute left-1/2 top-full z-20 mt-3 w-[min(320px,calc(100vw-32px))] -translate-x-1/2 animate-rise-in rounded-block bg-superficie p-1.5 text-left shadow-window"
        >
          {pains.map((pain, index) => {
            const selected = pain.id === value;
            return (
              <li key={pain.id} role="presentation">
                <button
                  ref={(element) => {
                    optionRefs.current[index] = element;
                  }}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => choose(pain.id)}
                  className={`flex w-full items-center justify-between gap-3 rounded-field px-3.5 py-2.5 text-[16px] font-semibold outline-none transition-colors duration-150 hover:bg-campo focus-visible:bg-campo ${selected ? "text-verde-tinta" : "text-tinta"}`}
                >
                  {pain.selectorLabel}
                  {selected && <Check size={18} strokeWidth={2.6} className="shrink-0 text-verde" aria-hidden />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
