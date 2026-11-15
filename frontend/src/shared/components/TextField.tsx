import { useId, useState, type ChangeEvent, type InputHTMLAttributes, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";
import { DateField, DateTimeField, MonthField, TimeField } from "./DateField";

type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
  label: string;
  error?: string;
  hint?: string;
  // Optional element on the right of the label, e.g. a "Esqueci minha senha" link.
  labelAction?: ReactNode;
};

export function TextField(props: TextFieldProps) {
  // Dates and times use the app's own pickers, never the browser's (same props, same onChange shape).
  const pickers = { date: DateField, month: MonthField, time: TimeField, "datetime-local": DateTimeField } as const;
  const Picker = props.type ? pickers[props.type as keyof typeof pickers] : undefined;
  if (Picker) {
    const { label, value, onChange, min, max, disabled, error, hint, className, placeholder } = props;
    return (
      <Picker
        label={label}
        value={String(value ?? "")}
        onChange={(event) => onChange?.(event as unknown as ChangeEvent<HTMLInputElement>)}
        min={min === undefined ? undefined : String(min)}
        max={max === undefined ? undefined : String(max)}
        disabled={disabled}
        error={error}
        hint={hint}
        className={className}
        placeholder={placeholder}
      />
    );
  }
  return <TextInput {...props} />;
}

function TextInput({ label, error, hint, labelAction, type = "text", className = "", ...props }: TextFieldProps) {
  const id = useId();
  const messageId = `${id}-message`;
  const isPassword = type === "password";
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const message = error ?? hint;

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-semibold text-tinta">
          {label}
        </label>
        {labelAction}
      </div>

      <div className="relative">
        <input
          id={id}
          type={isPassword && isPasswordVisible ? "text" : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={message ? messageId : undefined}
          className={`w-full rounded-field bg-campo px-4 py-3 text-[15px] font-medium text-tinta outline-none focus-visible:outline-none transition-[background-color,box-shadow] duration-150 ease-out placeholder:font-normal placeholder:text-tinta-suave/80 focus:bg-superficie focus:ring-2 disabled:opacity-60 ${
            error ? "ring-2 ring-vermelho focus:ring-vermelho" : "focus:ring-verde"
          } ${isPassword ? "pr-12" : ""}`}
          {...props}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setIsPasswordVisible((visible) => !visible)}
            aria-label={isPasswordVisible ? "Esconder senha" : "Mostrar senha"}
            aria-pressed={isPasswordVisible}
            className="absolute inset-y-0 right-1 my-auto grid size-10 place-items-center rounded-full text-tinta-suave transition-colors hover:text-tinta"
          >
            {isPasswordVisible ? <EyeOff size={18} strokeWidth={1.75} /> : <Eye size={18} strokeWidth={1.75} />}
          </button>
        )}
      </div>

      {message && (
        <p id={messageId} className={`text-[13px] leading-snug ${error ? "font-medium text-vermelho" : "text-tinta-suave"}`}>
          {message}
        </p>
      )}
    </div>
  );
}
