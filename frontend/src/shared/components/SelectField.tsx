import { useCallback, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { Check, ChevronDown } from "lucide-react";
import { popoverPanelClass, useAnchoredPopover } from "./useAnchoredPopover";

// Same shape callers already read (event.target.value), without the browser's native list.
export type SelectChange = { target: { value: string } };

export type SelectFieldProps = {
  label: string;
  options: Array<{ value: string; label: string }>;
  // Numbers are accepted like in a native select (compared as text).
  value: string | number;
  onChange: (event: SelectChange) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
  // "pill": rounded filter on a page; "compact": a cell in a table; "plain": text-only (side menu).
  variant?: "field" | "pill" | "compact" | "plain";
  // The label stays for screen readers only.
  hideLabel?: boolean;
};

const triggerByVariant = {
  field: "rounded-field bg-campo py-3 pl-4 pr-10 text-[15px] font-medium focus-visible:bg-superficie",
  pill: "rounded-full bg-superficie py-2.5 pl-4 pr-9 text-sm font-medium shadow-whisper",
  compact: "min-h-10 rounded-field bg-campo py-2 pl-2.5 pr-8 text-sm",
  plain: "rounded-chip bg-transparent py-1 pl-0 pr-6 text-sm font-semibold hover:text-tinta-forte",
};

// The app's dropdown (#inputs): a button that opens a list in the app's look, above dialogs too.
// Keyboard: arrows, Home/End, Enter/Space to pick, Escape to close, letters to jump.
export function SelectField({ label, options, value: rawValue, onChange, placeholder, error, disabled, className = "", variant = "field", hideLabel = false }: SelectFieldProps) {
  const value = String(rawValue);
  const id = useId();
  const listId = `${id}-list`;
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const { anchorRef, popoverRef, style } = useAnchoredPopover(open, close);
  const items = placeholder ? [{ value: "", label: placeholder }, ...options] : options;
  const selectedIndex = Math.max(0, items.findIndex((item) => item.value === value));
  const [activeIndex, setActiveIndex] = useState(selectedIndex);
  const optionRefs = useRef<Array<HTMLLIElement | null>>([]);
  const typed = useRef({ text: "", at: 0 });
  const selected = items.find((item) => item.value === value);

  // Keeps the active option in view inside the list only (scrollIntoView would also move the page).
  // Runs after the panel gets its height, so the chosen option shows when the list opens.
  useLayoutEffect(() => {
    const list = popoverRef.current;
    const option = optionRefs.current[activeIndex];
    if (!open || !list || !option) return;
    if (option.offsetTop < list.scrollTop) list.scrollTop = option.offsetTop - 4;
    else if (option.offsetTop + option.offsetHeight > list.scrollTop + list.clientHeight)
      list.scrollTop = option.offsetTop + option.offsetHeight - list.clientHeight + 4;
  }, [open, activeIndex, style, popoverRef]);

  function openList() {
    if (disabled) return;
    setActiveIndex(selectedIndex);
    setOpen(true);
  }

  function pick(index: number) {
    const item = items[index];
    if (!item) return;
    if (item.value !== value) onChange({ target: { value: item.value } });
    setOpen(false);
    anchorRef.current?.focus();
  }

  function jumpTo(letter: string) {
    const now = Date.now();
    typed.current = { text: now - typed.current.at < 700 ? typed.current.text + letter : letter, at: now };
    const text = typed.current.text.toLocaleLowerCase("pt-BR");
    const found = items.findIndex((item) => item.label.toLocaleLowerCase("pt-BR").startsWith(text));
    if (found >= 0) {
      if (open) setActiveIndex(found);
      else pick(found);
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    const last = items.length - 1;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) return openList();
      setActiveIndex((index) => Math.min(last, Math.max(0, index + (event.key === "ArrowDown" ? 1 : -1))));
    } else if (event.key === "Home" || event.key === "End") {
      if (!open) return;
      event.preventDefault();
      setActiveIndex(event.key === "Home" ? 0 : last);
    } else if (event.key === " " && Date.now() - typed.current.at < 700) {
      // A space in the middle of typing ("Torre A") is part of the search, like a native select.
      event.preventDefault();
      jumpTo(" ");
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (open) pick(activeIndex);
      else openList();
    } else if (event.key === "Tab" && open) {
      setOpen(false);
    } else if (event.key.length === 1 && /\S/.test(event.key)) {
      jumpTo(event.key);
    }
  }

  return (
    <div className={`flex flex-col ${hideLabel ? "" : "gap-2"} ${className}`}>
      <label htmlFor={id} className={hideLabel ? "sr-only" : "text-sm font-semibold text-tinta"}>
        {label}
      </label>
      <button
        ref={(element) => {
          anchorRef.current = element;
        }}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open ? `${listId}-${activeIndex}` : undefined}
        aria-invalid={error ? true : undefined}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        className={`relative w-full cursor-pointer text-left outline-none transition-[background-color,box-shadow] duration-150 focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${triggerByVariant[variant]} ${
          error ? "ring-2 ring-vermelho" : "focus-visible:ring-verde"
        } ${open && variant !== "plain" ? "ring-2 ring-verde" : ""} ${open && variant === "field" ? "bg-superficie" : ""} ${selected && selected.value !== "" ? "text-tinta" : "text-tinta-suave"}`}
      >
        <span className="block truncate">{selected?.label ?? placeholder ?? "Escolha"}</span>
        <ChevronDown
          size={18}
          strokeWidth={1.8}
          aria-hidden
          className={`pointer-events-none absolute inset-y-0 my-auto text-tinta-suave transition-transform duration-150 ${variant === "plain" ? "right-0" : variant === "compact" ? "right-2" : "right-3"} ${open ? "rotate-180" : ""}`}
        />
      </button>
      <div ref={popoverRef} popover="manual" style={style} className={popoverPanelClass}>
        <ul id={listId} role="listbox" aria-labelledby={id} tabIndex={-1}>
          {items.map((item, index) => {
            const isSelected = item.value === value;
            const isActive = index === activeIndex;
            return (
              <li
                key={`${item.value}-${index}`}
                id={`${listId}-${index}`}
                ref={(element) => {
                  optionRefs.current[index] = element;
                }}
                role="option"
                aria-selected={isSelected}
                onPointerMove={() => setActiveIndex(index)}
                onClick={() => pick(index)}
                className={`flex cursor-pointer items-center justify-between gap-3 rounded-field px-3 py-2.5 text-[15px] ${
                  isActive ? "bg-campo" : ""
                } ${isSelected ? "font-semibold text-tinta" : item.value === "" ? "text-tinta-suave" : "text-tinta"}`}
              >
                <span className="min-w-0 truncate">{item.label}</span>
                {isSelected && <Check size={16} strokeWidth={2} aria-hidden className="shrink-0 text-verde-tinta" />}
              </li>
            );
          })}
        </ul>
      </div>
      {error && <p className="text-[13px] font-medium text-vermelho">{error}</p>}
    </div>
  );
}
