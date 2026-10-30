import { useId, type TextareaHTMLAttributes } from "react";

type TextAreaFieldProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id"> & {
  label: string;
  error?: string;
  hint?: string;
};

// Multi-line sibling of TextField; shows a character counter when maxLength is set.
export function TextAreaField({ label, error, hint, maxLength, value, rows = 5, className = "", ...props }: TextAreaFieldProps) {
  const id = useId();
  const messageId = `${id}-message`;
  const message = error ?? hint;
  const length = typeof value === "string" ? value.length : 0;

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-semibold text-tinta">
          {label}
        </label>
        {maxLength && (
          <span className={`text-xs tabular-nums ${length >= maxLength ? "font-semibold text-vermelho" : "text-tinta-suave"}`}>
            {length}/{maxLength}
          </span>
        )}
      </div>

      <textarea
        id={id}
        rows={rows}
        value={value}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
        aria-describedby={message ? messageId : undefined}
        className={`w-full resize-y rounded-field bg-campo px-4 py-3 text-[15px] leading-relaxed text-tinta outline-none focus-visible:outline-none transition-[background-color,box-shadow] duration-150 ease-out placeholder:text-tinta-suave/80 focus:bg-superficie focus:ring-2 disabled:opacity-60 ${
          error ? "ring-2 ring-vermelho focus:ring-vermelho" : "focus:ring-verde"
        }`}
        {...props}
      />

      {message && (
        <p id={messageId} className={`text-[13px] leading-snug ${error ? "font-medium text-vermelho" : "text-tinta-suave"}`}>
          {message}
        </p>
      )}
    </div>
  );
}
