import { useId, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";

type SelectFieldProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "id"> & {
  label: string;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  error?: string;
};

// Native select styled like TextField (keyboard and mobile pickers come for free).
export function SelectField({ label, options, placeholder, error, className = "", ...props }: SelectFieldProps) {
  const id = useId();

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label htmlFor={id} className="text-sm font-semibold text-tinta">
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          aria-invalid={error ? true : undefined}
          className={`w-full cursor-pointer appearance-none rounded-field bg-campo px-4 py-3 pr-10 text-[15px] font-medium text-tinta outline-none transition-[background-color,box-shadow] duration-150 focus:bg-superficie focus:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 ${
            error ? "ring-2 ring-vermelho" : "focus:ring-verde"
          }`}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown size={18} strokeWidth={1.8} aria-hidden className="pointer-events-none absolute inset-y-0 right-3 my-auto text-tinta-suave" />
      </div>
      {error && <p className="text-[13px] font-medium text-vermelho">{error}</p>}
    </div>
  );
}
