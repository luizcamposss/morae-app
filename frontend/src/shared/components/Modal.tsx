import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

type ModalProps = {
  title: string;
  description?: ReactNode;
  // Element on the left of the title (e.g. an avatar or a status tile).
  leading?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  // Buttons row at the bottom (e.g. Cancelar + Salvar).
  footer?: ReactNode;
  size?: "md" | "lg";
};

// Native <dialog>: focus stays inside, Esc closes, the page behind is inert.
export function Modal({ title, description, leading, onClose, children, footer, size = "md" }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  // Unique per dialog: a modal can open on top of another one.
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
      aria-labelledby={titleId}
      className={`m-auto max-h-[calc(100svh-2rem)] w-[calc(100%-2rem)] overflow-hidden rounded-card bg-superficie p-0 text-tinta shadow-window backdrop:bg-tinta/30 backdrop:backdrop-blur-[2px] ${
        size === "lg" ? "max-w-3xl" : "max-w-lg"
      }`}
    >
      <div className="flex max-h-[calc(100svh-2rem)] flex-col">
        <header className="flex items-start justify-between gap-4 px-6 pb-4 pt-6">
          <div className="flex min-w-0 items-center gap-3">
            {leading}
            <div className="min-w-0">
            <h2 id={titleId} className="font-display text-[24px] font-bold leading-tight tracking-[-0.01em]">
              {title}
            </h2>
            {description && <div className="mt-1 text-sm text-tinta-suave">{description}</div>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="grid size-9 shrink-0 place-items-center rounded-full text-tinta-suave transition-colors hover:bg-campo hover:text-tinta"
          >
            <X size={18} strokeWidth={1.8} aria-hidden />
          </button>
        </header>

        <div className="overflow-y-auto px-6 pb-6">{children}</div>

        {footer && <footer className="flex justify-end gap-3 border-t border-linha px-6 py-4">{footer}</footer>}
      </div>
    </dialog>
  );
}
