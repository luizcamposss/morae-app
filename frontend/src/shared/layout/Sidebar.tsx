import { NavLink, useNavigate } from "react-router-dom";
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
            { label: "Dashboard", icon: "D", to: "/master/dashboard" },
            { label: "Condominios", icon: "C", to: "/master/dashboard" },
            { label: "Usuarios", icon: "U", to: "/master/dashboard" },
        ];
    }

    if (role === "Admin") {
        return [
            { label: "Dashboard", icon: "D", to: "/admin/dashboard" },
            { label: "Predios", icon: "P", to: "/admin/buildings" },
            { label: "Unidades", icon: "U", to: "/admin/units" },
            { label: "Moradores", icon: "M", to: "/admin/people" },
            { label: "Pagamentos", icon: "G", to: "/admin/dashboard" },
        ];
    }

    if (role === "Syndic") {
        return [
            { label: "Dashboard", icon: "D", to: "/syndic/dashboard" },
            { label: "Moradores", icon: "M", to: "/syndic/dashboard" },
            { label: "Manutencao", icon: "A", to: "/syndic/dashboard" },
        ];
    }

    return [
        { label: "Dashboard", icon: "D", to: "/resident/dashboard" },
        { label: "Configuracoes", icon: "G", to: "/resident/settings" },
    ];
}

export function Sidebar() {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const primaryRole = getPrimaryRole(user?.roles ?? []);
    const menuItems = getMenuItemsByRole(primaryRole);

    function handleLogout() {
        logout();
        navigate("/login");
    }

    return (
        <div className="group fixed left-6 top-1/2 -translate-y-1/2">
            <aside className="flex h-[560px] w-20 flex-col overflow-hidden rounded-[1.75rem] border border-[#E5E7EB] bg-white px-4 py-5 shadow-sm transition-all duration-300 group-hover:w-72 group-hover:shadow-2xl group-hover:shadow-[#0B3D2E]/10">
                <div className="mb-8 flex items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#0B3D2E] text-sm font-black text-white">
                        M
                    </div>

                    <div className="min-w-0 -translate-x-2 overflow-hidden opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100">
                        <p className="text-xl font-extrabold text-[#0B3D2E]">morae</p>
                        <p className="mt-1 whitespace-nowrap text-sm font-semibold text-[#6B7280]">
                            Painel {primaryRole}
                        </p>
                    </div>
                </div>

                <nav className="flex flex-1 flex-col gap-2">
                    {menuItems.map((item) => (
                        <NavLink
                            key={item.label}
                            to={item.to}
                            title={item.label}
                            className={({ isActive }) =>
                                `flex items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-bold transition ${isActive
                                    ? "bg-[#DCFCE7] text-[#0B3D2E]"
                                    : "text-[#111827] hover:bg-[#DCFCE7] hover:text-[#0B3D2E]"
                                }`
                            }
                        >
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#F3F4F6] text-xs font-extrabold text-[#16A34A]">
                                {item.icon}
                            </span>

                            <span className="whitespace-nowrap -translate-x-2 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100">
                                {item.label}
                            </span>
                        </NavLink>
                    ))}
                </nav>

                <div className="space-y-3">
                    <div className="flex items-center gap-3 rounded-2xl px-3 py-2">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#DCFCE7] text-xs font-extrabold text-[#16A34A]">
                            {primaryRole.charAt(0)}
                        </div>

                        <div className="min-w-0 -translate-x-2 whitespace-nowrap opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100">
                            <p className="text-sm font-semibold text-[#6B7280]">
                                {primaryRole.toLowerCase()}
                            </p>
                            <p className="text-sm font-extrabold text-[#111827]">sessao ativa</p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleLogout}
                        className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-bold text-[#111827] transition hover:bg-[#FDECEC] hover:text-[#B42318]"
                    >
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#F3F4F6] text-xs font-extrabold text-[#6B7280]">
                            S
                        </span>

                        <span className="whitespace-nowrap -translate-x-2 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100">
                            Sair
                        </span>
                    </button>
                </div>
            </aside>
        </div>
    );
}
