import { NavLink, useNavigate } from "react-router-dom";
import { ChevronDown, LogOut, type LucideIcon } from "lucide-react";
import { useAuth } from "../../app/providers/useAuth";
import { useCondominium } from "../../app/providers/useCondominium";
import { useSyndicAccess } from "../../features/syndicAccess/useSyndicAccess";
import { roleAreas, type AreaRole } from "../../app/routes";
import { MoraeMark } from "../components/MoraeMark";

type MenuItem = {
  label: string;
  icon: LucideIcon;
  to: string;
  placement?: "footer";
};

function getPrimaryRole(roles: string[]): AreaRole {
  if (roles.includes("Master")) return "Master";
  if (roles.includes("Admin")) return "Admin";
  if (roles.includes("Syndic")) return "Syndic";
  return "Resident";
}

// Menu entries come from the role registries; a syndic only sees what the Admin allowed.
function getMenuItems(role: AreaRole, syndicAccess: ReturnType<typeof useSyndicAccess>): MenuItem[] {
  const area = roleAreas[role];

  return area.routes.flatMap(({ path, nav, syndicAccess: accessKey }) => {
    if (!nav || (accessKey && !syndicAccess?.[accessKey])) {
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
  const menuItems = getMenuItems(primaryRole, syndicAccess);
  const mainItems = menuItems.filter((item) => item.placement !== "footer");
  const footerItems = menuItems.filter((item) => item.placement === "footer");

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-62 flex-col bg-menu px-3.5 pb-6 pt-7 lg:flex">
        <div className="px-2.5">
          <MoraeMark withName size={26} />
          {primaryRole === "Master" ? (
            <p className="mt-5 text-sm font-semibold text-tinta">Plataforma</p>
          ) : (
            <CondominiumSwitcher />
          )}
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
        <div className="flex gap-1 overflow-x-auto [scrollbar-width:none]">
          {menuItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex min-w-17 flex-1 flex-col items-center gap-1 rounded-field px-2 py-1.5 text-[11px] font-semibold transition-colors ${
                  isActive ? "bg-verde-suave text-verde-tinta" : "text-tinta-suave hover:text-tinta"
                }`
              }
            >
              <item.icon size={20} strokeWidth={1.6} aria-hidden />
              <span className="max-w-full truncate">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  );
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
