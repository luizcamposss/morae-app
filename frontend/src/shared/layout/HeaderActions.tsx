import { useEffect, useId, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogOut, SlidersHorizontal } from "lucide-react";
import { Avatar } from "../components/Avatar";
import { useAuth } from "../../app/providers/useAuth";
import { getPrimaryRole, roleAreas, roleLabels } from "../../app/routes";
import { NotificationsMenu } from "./NotificationsMenu";

export function HeaderActions() {
  return (
    <div className="flex items-center gap-3">
      <NotificationsMenu />
      <ProfileMenu />
    </div>
  );
}

// Avatar button that opens a small profile card: who is signed in, their role, Ajustes and Sair.
function ProfileMenu() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const panelId = useId();

  const displayName = user?.personName || user?.userName || "Usuário";
  const role = getPrimaryRole(user?.roles ?? []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        aria-controls={panelId}
        aria-label={`Perfil de ${displayName}`}
        data-tour="header:profile"
        className="rounded-full transition-shadow duration-150 hover:ring-4 hover:ring-campo aria-expanded:ring-4 aria-expanded:ring-verde-suave"
      >
        <Avatar name={displayName} photoUrl={user?.profilePhotoUrl} className="size-10 text-sm" />
      </button>

      {isOpen && (
        <div
          id={panelId}
          className="absolute right-0 top-12 z-50 w-[min(18rem,calc(100vw-2rem))] origin-top-right animate-rise-in overflow-hidden rounded-card bg-superficie shadow-window motion-reduce:animate-none"
        >
          <div className="flex items-center gap-3 px-5 pb-4 pt-5">
            <Avatar name={displayName} photoUrl={user?.profilePhotoUrl} className="size-12 text-base" />
            <div className="min-w-0">
              <p className="truncate font-display text-[17px] font-bold tracking-[-0.01em] text-tinta">{displayName}</p>
              <p className="truncate text-[13px] text-tinta-suave">{user?.email}</p>
              <span className="mt-1.5 inline-block rounded-chip bg-verde-suave px-2 py-0.5 text-xs font-semibold text-verde-tinta">
                {roleLabels[role]}
              </span>
            </div>
          </div>

          <div className="border-t border-linha p-2">
            <Link
              to={`${roleAreas[role].basePath}/settings`}
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 rounded-field px-3 py-2.5 text-sm font-semibold text-tinta transition-colors hover:bg-campo"
            >
              <SlidersHorizontal size={18} strokeWidth={1.8} aria-hidden className="text-tinta-suave" />
              Ajustes
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-field px-3 py-2.5 text-sm font-semibold text-vermelho transition-colors hover:bg-vermelho-suave"
            >
              <LogOut size={18} strokeWidth={1.8} aria-hidden />
              Sair
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

