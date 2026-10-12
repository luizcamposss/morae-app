import type { ButtonHTMLAttributes } from "react";
import { MoraeMark } from "./MoraeMark";

type ButtonVariant = "primary" | "accent" | "quiet";
type ButtonSize = "md" | "sm";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  isLoading?: boolean;
  loadingText?: string;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-tinta text-white hover:bg-tinta-forte",
  accent: "bg-verde text-verde-tinta hover:bg-verde-forte",
  quiet: "bg-campo text-tinta hover:bg-menu",
};

const sizeClasses: Record<ButtonSize, string> = {
  md: "min-h-12 px-6 text-[15px]",
  sm: "min-h-9 px-4 text-sm",
};

export function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  isLoading = false,
  loadingText,
  disabled,
  type = "button",
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      className={`inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors duration-150 ease-out ${isLoading ? "cursor-progress" : "disabled:cursor-not-allowed disabled:opacity-60"} ${variantClasses[variant]} ${sizeClasses[size]} ${fullWidth ? "w-full" : ""} ${className}`}
      {...props}
    >
      {isLoading ? (
        <>
          <MoraeMark size={size === "md" ? 20 : 16} motion="respiro" />
          <span>{loadingText ?? children}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
