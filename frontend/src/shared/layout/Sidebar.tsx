import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { svgIcone } from "@edusites/icons/core";
import { useAuth } from "../../app/providers/useAuth";

type MenuItem = {
  label: string;
  icon: string;
  to: string;
};

function getPrimaryRole(roles: string[]) {
  if (roles.includes("Master")) return "Master";
  if (roles.includes("Admin")) return "Admin";
  if (roles.includes("Syndic")) return "Syndic";
  return "Resident";
}

function getMenuItemsByRole(role: string): MenuItem[] {
  if (role === "Master") {
    return [
      { label: "Dashboard", icon: "dashboard", to: "/master/dashboard" },
      { label: "Condomínios", icon: "predio", to: "/master/condominiums" },
      { label: "Convites", icon: "envelope-2", to: "/master/invitations" },
      { label: "Pagamentos", icon: "boleto", to: "/master/payments" },
      { label: "Usuários", icon: "usuarios", to: "/master/users" },
      { label: "Configurações", icon: "engrenagem", to: "/master/settings" },
    ];
  }

  if (role === "Admin") {
    return [
      { label: "Dashboard", icon: "dashboard", to: "/admin/dashboard" },
      { label: "Prédios", icon: "predio", to: "/admin/buildings" },
      { label: "Unidades", icon: "apartamento", to: "/admin/units" },
      { label: "Moradores", icon: "usuarios", to: "/admin/people" },
      { label: "Convites", icon: "envelope-2", to: "/admin/invitations" },
      { label: "Pagamentos", icon: "boleto", to: "/admin/payments" },
      { label: "Configurações", icon: "engrenagem", to: "/admin/settings" },
    ];
  }

  if (role === "Syndic") {
    return [
      { label: "Dashboard", icon: "dashboard", to: "/syndic/dashboard" },
      { label: "Moradores", icon: "usuarios", to: "/syndic/residents" },
      { label: "Financeiro", icon: "boleto", to: "/syndic/finance" },
      { label: "Comunicados", icon: "envelope-2", to: "/syndic/communication" },
      { label: "Ocorrências", icon: "alerta", to: "/syndic/maintenance" },
      { label: "Configurações", icon: "engrenagem", to: "/syndic/settings" },
    ];
  }

  return [
    { label: "Dashboard", icon: "dashboard", to: "/resident/dashboard" },
    { label: "Minha unidade", icon: "apartamento", to: "/resident/unit" },
    { label: "Boletos", icon: "boleto", to: "/resident/bills" },
    { label: "Avisos", icon: "envelope-2", to: "/resident/notices" },
    { label: "Configurações", icon: "engrenagem", to: "/resident/settings" },
  ];
}

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const primaryRole = getPrimaryRole(user?.roles ?? []);
  const menuItems = getMenuItemsByRole(primaryRole);
  const sidebarTopClass = location.pathname.endsWith("/dashboard")
    ? "top-[8.25rem]"
    : "top-[8rem]";

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <>
      <div className={`group fixed left-5 ${sidebarTopClass} z-40 hidden lg:block`}>
        <aside className="flex h-[min(640px,calc(100vh-48px))] w-[4.875rem] flex-col overflow-hidden rounded-[1.9rem] border border-[#E5E7EB] bg-white px-3 py-5 shadow-sm transition-all duration-300 group-hover:w-72 group-hover:shadow-2xl group-hover:shadow-[#0B3D2E]/10">
          <div className="mb-7 flex h-12 w-full items-center justify-center gap-3 group-hover:justify-start group-hover:px-1">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#0B3D2E] text-sm font-black text-white shadow-sm shadow-[#0B3D2E]/20">
              M
            </div>

            <div className="w-0 min-w-0 -translate-x-2 overflow-hidden opacity-0 transition-all duration-200 group-hover:w-auto group-hover:translate-x-0 group-hover:opacity-100">
              <p className="text-xl font-extrabold text-[#0B3D2E]">MORAÊ</p>
              <p className="mt-1 whitespace-nowrap text-sm font-semibold text-[#6B7280]">
                Painel {primaryRole}
              </p>
            </div>
          </div>

          <nav className="flex flex-1 flex-col items-center gap-2 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {menuItems.map((item) => (
              <NavLink
                key={item.label}
                to={item.to}
                title={item.label}
                className={({ isActive }) =>
                  `flex h-12 w-full items-center justify-center rounded-2xl text-left text-sm font-extrabold transition group-hover:justify-start group-hover:gap-3 group-hover:px-2 ${
                    isActive
                      ? "bg-[#DCFCE7] text-[#0B3D2E] shadow-sm shadow-[#16A34A]/10"
                      : "text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#0B3D2E]"
                  }`
                }
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-lg text-[#16A34A] ring-1 ring-[#E5E7EB]">
                  <EduIcon nome={item.icon} />
                </span>

                <span className="w-0 whitespace-nowrap -translate-x-2 overflow-hidden opacity-0 transition-all duration-200 group-hover:w-auto group-hover:translate-x-0 group-hover:opacity-100">
                  {item.label}
                </span>
              </NavLink>
            ))}
          </nav>

          <div className="mt-4 space-y-3">
            <div className="flex h-12 w-full items-center justify-center gap-3 rounded-2xl group-hover:justify-start group-hover:px-2">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#DCFCE7] text-lg text-[#16A34A]">
                <EduIcon nome="usuario" />
              </div>

              <div className="w-0 min-w-0 -translate-x-2 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-200 group-hover:w-auto group-hover:translate-x-0 group-hover:opacity-100">
                <p className="text-sm font-semibold text-[#6B7280]">
                  {primaryRole.toLowerCase()}
                </p>
                <p className="text-sm font-extrabold text-[#111827]">sessão ativa</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="flex h-12 w-full cursor-pointer items-center justify-center rounded-2xl text-left text-sm font-extrabold text-[#6B7280] transition hover:bg-[#FDECEC] hover:text-[#B42318] group-hover:justify-start group-hover:gap-3 group-hover:px-2"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#F3F4F6] text-lg">
                <EduIcon nome="sair" />
              </span>

              <span className="w-0 whitespace-nowrap -translate-x-2 overflow-hidden opacity-0 transition-all duration-200 group-hover:w-auto group-hover:translate-x-0 group-hover:opacity-100">
                Sair
              </span>
            </button>
          </div>
        </aside>
      </div>

      <nav className="fixed inset-x-3 bottom-3 z-50 rounded-[1.5rem] border border-[#E5E7EB] bg-white/95 p-2 shadow-2xl shadow-[#0B3D2E]/15 backdrop-blur lg:hidden">
        <div className="flex gap-2 overflow-x-auto">
          {menuItems.map((item) => (
            <NavLink
              key={item.label}
              to={item.to}
              title={item.label}
              className={({ isActive }) =>
                `flex min-w-[4.6rem] flex-col items-center justify-center rounded-2xl px-3 py-2 text-[0.68rem] font-black transition ${
                  isActive
                    ? "bg-[#DCFCE7] text-[#0B3D2E]"
                    : "text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#0B3D2E]"
                }`
              }
            >
              <span className="mb-1 text-lg text-[#16A34A]">
                <EduIcon nome={item.icon} />
              </span>
              <span className="max-w-[4.3rem] truncate">{item.label}</span>
            </NavLink>
          ))}

          <button
            type="button"
            onClick={handleLogout}
            className="flex min-w-[4.6rem] cursor-pointer flex-col items-center justify-center rounded-2xl px-3 py-2 text-[0.68rem] font-black text-[#6B7280] transition hover:bg-[#FDECEC] hover:text-[#B42318]"
          >
            <span className="mb-1 text-lg">
              <EduIcon nome="sair" />
            </span>
            <span>Sair</span>
          </button>
        </div>
      </nav>
    </>
  );
}

function EduIcon({ nome }: { nome: string }) {
  const [svg, setSvg] = useState<string | null>(() =>
    svgIcone({
      nome,
      cor: "currentColor",
      tamanho: "1em",
    }) ?? null,
  );

  useEffect(() => {
    let isMounted = true;

    async function loadIcon() {
      const icons = await import("@edusites/icons/core");
      const loadedSvg = await (icons as typeof icons & {
        svgIconeAsync?: (options: {
          nome: string;
          cor: string;
          tamanho: string;
        }) => Promise<string | null | undefined>;
      }).svgIconeAsync?.({
        nome,
        cor: "currentColor",
        tamanho: "1em",
      });

      if (isMounted) {
        setSvg(loadedSvg ?? null);
      }
    }

    if (!svg) {
      void loadIcon();
    }

    return () => {
      isMounted = false;
    };
  }, [nome, svg]);

  if (!svg) {
    return <span aria-hidden="true" className="inline-flex size-[1em]" />;
  }

  return (
    <span
      aria-hidden="true"
      className="inline-flex leading-none"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
