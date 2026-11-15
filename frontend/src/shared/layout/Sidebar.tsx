import { useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, LogOut, Menu, type LucideIcon } from "lucide-react";
import { useAuth } from "../../app/providers/useAuth";
import { useCondominium } from "../../app/providers/useCondominium";
import { useSyndicAccess } from "../../features/syndicAccess/useSyndicAccess";
import { hasSyndicAccess } from "../../features/syndicAccess/syndicAccessService";
import { isModuleEnabled } from "../../features/modules/modules";
import { getPrimaryRole, roleAreas, type AreaRole } from "../../app/routes";
import { MoraeMark } from "../components/MoraeMark";
import { Modal } from "../components/Modal";

type MenuItem = {
  label: string;
  shortLabel?: string;
  icon: LucideIcon;
  to: string;
  placement?: "footer";
};

// Menu entries come from the role registries; a syndic only sees what the Admin allowed, and
// nobody sees the modules the condominium turned off.
function getMenuItems(role: AreaRole, syndicAccess: ReturnType<typeof useSyndicAccess>, enabledModules: string[] | undefined): MenuItem[] {
  const area = roleAreas[role];

  return area.routes.flatMap(({ path, nav, syndicAccess: requirement, module }) => {
    if (!nav || (requirement && !hasSyndicAccess(syndicAccess, requirement)) || (module && !isModuleEnabled(enabledModules, module))) {
      return [];
    }

    return [{ ...nav, to: `${area.basePath}/${path}` }];
  });
}

export function Sidebar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const syndicAccess = useSyndicAccess();
  const primaryRole = getPrimaryRole(user?.roles ?? []);
  const { activeCondominium } = useCondominium();
  const menuItems = getMenuItems(primaryRole, syndicAccess, activeCondominium?.enabledModules);
  const mainItems = menuItems.filter((item) => item.placement !== "footer");
  const footerItems = menuItems.filter((item) => item.placement === "footer");
  // The bottom bar fits five slots: past that, the fifth becomes "Mais" and opens every entry.
  const hasMoreMenu = mainItems.length > 5;
  const barItems = hasMoreMenu ? mainItems.slice(0, 4) : mainItems;
  const moreItems = hasMoreMenu ? mainItems.slice(4) : [];
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const { pathname } = useLocation();
  const isMoreActive = [...moreItems, ...footerItems].some((item) => pathname.startsWith(item.to));

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-62 flex-col bg-menu px-3.5 pb-6 pt-7 lg:flex">
        <div className="px-2.5">
          {/* Relative to the area's layout route, so it lands on that role's Início. */}
          <Link to="dashboard" aria-label="Moraê, ir para o início" className="inline-block rounded-field">
            <MoraeMark withName size={26} />
          </Link>
          {primaryRole !== "Master" && <CondominiumSwitcher />}
        </div>

        <nav aria-label="Menu principal" className="mt-6 flex flex-1 flex-col gap-0.5 overflow-y-auto">
          {mainItems.map((item) => (
            <SidebarLink key={item.to} item={item} />
          ))}
        </nav>

        <div className="flex flex-col gap-0.5 pt-4">
          {footerItems.map((item) => (
            <SidebarLink key={item.to} item={item} />
          ))}

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-3 rounded-field px-2.5 py-2.5 text-[15px] font-medium text-tinta-suave transition-colors duration-150 hover:bg-superficie/60 hover:text-vermelho"
          >
            <LogOut size={18} strokeWidth={1.6} aria-hidden />
            Sair
          </button>
        </div>
      </aside>

      <nav
        aria-label="Menu principal"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-linha bg-superficie/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-sm lg:hidden"
      >
        {/* Footer items (Ajustes) live in the avatar's profile menu and in "Mais" on mobile. */}
        {/* Equal columns, no minimum width: the five items always fit, even at 320 px. */}
        <div className="grid auto-cols-fr grid-flow-col gap-1">
          {barItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => bottomItemClass(isActive)}>
              <item.icon size={20} strokeWidth={1.6} aria-hidden />
              <span className="max-w-full truncate">{item.shortLabel ?? item.label}</span>
            </NavLink>
          ))}

          {hasMoreMenu && (
            <button
              type="button"
              onClick={() => setIsMoreOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={isMoreOpen}
              className={bottomItemClass(isMoreActive)}
            >
              <Menu size={20} strokeWidth={1.6} aria-hidden />
              <span className="max-w-full truncate">Mais</span>
            </button>
          )}
        </div>
      </nav>

      {isMoreOpen && (
        <Modal title="Menu" onClose={() => setIsMoreOpen(false)}>
          <nav aria-label="Todas as seções" className="grid grid-cols-3 gap-2">
            {[...mainItems, ...footerItems].map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setIsMoreOpen(false)}
                className={({ isActive }) =>
                  `flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-field px-2 py-3 text-center text-[13px] font-semibold leading-tight transition-colors ${
                    isActive ? "bg-verde-suave text-verde-tinta" : "bg-campo text-tinta hover:text-tinta-forte"
                  }`
                }
              >
                <item.icon size={22} strokeWidth={1.6} aria-hidden />
                <span className="max-w-full">{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </Modal>
      )}
    </>
  );
}

function bottomItemClass(isActive: boolean) {
  return `flex min-w-0 flex-col items-center gap-1 rounded-field px-1 py-1.5 text-[11px] font-semibold transition-colors ${
    isActive ? "bg-verde-suave text-verde-tinta" : "text-tinta-suave hover:text-tinta"
  }`;
}

function SidebarLink({ item }: { item: MenuItem }) {
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        `group flex items-center gap-3 rounded-field px-2.5 py-2.5 text-[15px] transition-colors duration-150 ${
          isActive
            ? "bg-superficie font-semibold text-tinta shadow-whisper"
            : "font-medium text-tinta hover:bg-superficie/60"
        }`
      }
    >
      {({ isActive }) => (
        <>
          <item.icon
            size={18}
            strokeWidth={1.6}
            aria-hidden
            className={isActive ? "text-verde" : "text-tinta-suave group-hover:text-tinta"}
          />
          {item.label}
        </>
      )}
    </NavLink>
  );
}

// Shows the active condominium; becomes a picker when the user belongs to more than one.
function CondominiumSwitcher() {
  const { condominiums, activeCondominium, setActiveCondominiumId } = useCondominium();

  if (!activeCondominium) {
    return null;
  }

  if (condominiums.length < 2) {
    return <p className="mt-5 truncate text-sm font-semibold text-tinta">{activeCondominium.condominiumName}</p>;
  }

  return (
    <label className="relative mt-5 flex items-center">
      <span className="sr-only">Condomínio</span>
      <select
        value={activeCondominium.condominiumId}
        onChange={(event) => setActiveCondominiumId(Number(event.target.value))}
        className="w-full cursor-pointer appearance-none truncate rounded-chip bg-transparent py-1 pr-6 text-sm font-semibold text-tinta hover:text-tinta-forte"
      >
        {condominiums.map((condominium) => (
          <option key={condominium.condominiumId} value={condominium.condominiumId}>
            {condominium.condominiumName}
          </option>
        ))}
      </select>
      <ChevronDown size={16} strokeWidth={1.8} aria-hidden className="pointer-events-none absolute right-0 text-tinta-suave" />
    </label>
  );
}
