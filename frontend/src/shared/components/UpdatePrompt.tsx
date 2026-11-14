import { X } from "lucide-react";
import { useRegisterSW } from "virtual:pwa-register/react";

// Shows a quiet bar when a new service worker is waiting; reloads into it on "Atualizar".
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) {
    return null;
  }

  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-50 mx-auto flex max-w-sm items-center gap-3 rounded-block bg-tinta py-2 pl-4 pr-2 text-sm text-white shadow-float animate-rise-in lg:bottom-6 lg:left-auto lg:right-6 lg:mx-0"
    >
      <span className="flex-1">Nova versão disponível</span>
      <button
        type="button"
        onClick={() => void updateServiceWorker(true)}
        className="min-h-9 rounded-full bg-verde px-4 font-semibold text-verde-tinta transition-colors duration-150 ease-out hover:bg-verde-forte"
      >
        Atualizar
      </button>
      <button
        type="button"
        onClick={() => setNeedRefresh(false)}
        aria-label="Dispensar aviso"
        className="grid size-9 place-items-center rounded-full text-white/70 transition-colors duration-150 ease-out hover:bg-white/10 hover:text-white"
      >
        <X size={16} strokeWidth={1.75} aria-hidden />
      </button>
    </div>
  );
}
