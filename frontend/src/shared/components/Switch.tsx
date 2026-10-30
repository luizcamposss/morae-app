import { useId } from "react";

type SwitchProps = {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
};

// On/off row in the style of the iPhone Settings (DESIGN.md → Grouped List).
export function Switch({ label, description, checked, onChange, disabled }: SwitchProps) {
  const id = useId();

  return (
    <div className="flex items-center justify-between gap-4 py-3.5">
      <label htmlFor={id} className="min-w-0 cursor-pointer">
        <span className="block text-[15px] font-semibold text-tinta">{label}</span>
        {description && <span className="block text-[13px] text-tinta-suave">{description}</span>}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-60 ${checked ? "bg-verde" : "bg-linha"}`}
      >
        <span
          aria-hidden
          className={`absolute left-0.5 top-0.5 size-6 rounded-full bg-superficie shadow-whisper transition-transform duration-200 ease-out ${checked ? "translate-x-5" : ""}`}
        />
      </button>
    </div>
  );
}
