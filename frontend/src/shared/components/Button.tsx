import type { ButtonHTMLAttributes, Ref } from "react";
import { Link, type LinkProps } from "react-router-dom";
import { MoraeMark } from "./MoraeMark";

type ButtonVariant = "primary" | "accent" | "quiet" | "danger";
type ButtonSize = "md" | "sm";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  ref?: Ref<HTMLButtonElement>;
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
  danger: "bg-vermelho text-white hover:bg-vermelho/90",
};

const sizeClasses: Record<ButtonSize, string> = {
  md: "min-h-12 px-6 text-[15px]",
  sm: "min-h-9 px-4 text-sm",
};

function buttonClasses(variant: ButtonVariant, size: ButtonSize, fullWidth: boolean) {
  return `inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors duration-150 ease-out ${variantClasses[variant]} ${sizeClasses[size]} ${fullWidth ? "w-full" : ""}`;
}

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
      className={`${buttonClasses(variant, size, fullWidth)} ${isLoading ? "cursor-progress" : "disabled:cursor-not-allowed disabled:opacity-60"} ${className}`}
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

type ButtonLinkProps = LinkProps & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
};

// A navigation link that looks like a button (never nest a <button> inside a <Link>).
export function ButtonLink({ variant = "primary", size = "md", fullWidth = false, className = "", ...props }: ButtonLinkProps) {
  return <Link className={`${buttonClasses(variant, size, fullWidth)} ${className}`} {...props} />;
}
