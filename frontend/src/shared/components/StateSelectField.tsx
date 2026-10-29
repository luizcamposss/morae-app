import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Check, ChevronDown } from "lucide-react";

type StateSelectFieldProps = {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
};

const COLUMNS = 6;

export function StateSelectField({
  label,
  value,
  options,
  onChange,
  placeholder = "Selecione a UF",
  error,
  disabled = false,
}: StateSelectFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const listboxId = `${id}-options`;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [isOpen, setIsOpen] = useState(false);

  const selectedIndex = options.indexOf(value);

  useEffect(() => {
    if (!isOpen) return;

    const indexToFocus = selectedIndex >= 0 ? selectedIndex : 0;
    optionRefs.current[indexToFocus]?.focus();

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen, selectedIndex]);

  function closeAndFocusTrigger() {
    setIsOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }

  function selectOption(option: string) {
    onChange(option);
    closeAndFocusTrigger();
  }

  function handleOptionKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex: number | null = null;

    switch (event.key) {
      case "ArrowRight":
        nextIndex = Math.min(index + 1, options.length - 1);
        break;
      case "ArrowLeft":
        nextIndex = Math.max(index - 1, 0);
        break;
      case "ArrowDown":
        nextIndex = Math.min(index + COLUMNS, options.length - 1);
        break;
      case "ArrowUp":
        nextIndex = Math.max(index - COLUMNS, 0);
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = options.length - 1;
        break;
      case "Escape":
        event.preventDefault();
        closeAndFocusTrigger();
        return;
      default:
        return;
    }

    event.preventDefault();
    optionRefs.current[nextIndex]?.focus();
  }

  return (
    <div ref={containerRef} className="flex flex-col gap-2">
      <label id={`${id}-label`} htmlFor={id} className="text-sm font-semibold text-tinta">
        {label}
      </label>

      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-labelledby={`${id}-label ${id}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        onClick={() => setIsOpen((current) => !current)}
        className={`flex w-full touch-manipulation items-center justify-between gap-3 rounded-field bg-campo px-4 py-3 text-left text-base font-medium outline-none transition-[background-color,box-shadow] duration-150 focus:bg-superficie focus:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 ${
          error ? "ring-2 ring-vermelho" : "focus:ring-verde"
        }`}
      >
        <span className={value ? "text-tinta" : "text-tinta-suave"}>{value || placeholder}</span>
        <ChevronDown
          size={18}
          strokeWidth={1.8}
          aria-hidden
          className={`shrink-0 text-tinta-suave transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div
          id={listboxId}
          role="listbox"
          aria-labelledby={`${id}-label`}
          className="grid grid-cols-6 gap-1 rounded-field border border-linha bg-superficie p-2 shadow-card"
        >
          {options.map((option, index) => {
            const isSelected = option === value;

            return (
              <button
                key={option}
                ref={(element) => {
                  optionRefs.current[index] = element;
                }}
                type="button"
                role="option"
                aria-selected={isSelected}
                tabIndex={index === (selectedIndex >= 0 ? selectedIndex : 0) ? 0 : -1}
                onClick={() => selectOption(option)}
                onKeyDown={(event) => handleOptionKeyDown(event, index)}
                className={`relative min-h-11 touch-manipulation rounded-lg px-2 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-verde ${
                  isSelected ? "bg-verde text-white" : "text-tinta hover:bg-campo"
                }`}
              >
                {option}
                {isSelected && <Check size={13} strokeWidth={2.2} aria-hidden className="absolute right-1 top-1" />}
              </button>
            );
          })}
        </div>
      )}

      {error && (
        <p id={errorId} role="alert" className="text-[13px] font-medium text-vermelho">
          {error}
        </p>
      )}
    </div>
  );
}
