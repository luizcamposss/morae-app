import { Building2, House, Receipt, SlidersHorizontal, Users } from "lucide-react";
import { MasterDashboardPage } from "../../features/masterDashboard/MasterDashboardPage";
import { CondominiumsPage } from "../../features/masterCondominiums/CondominiumsPage";
import { PlatformPaymentsPage } from "../../features/masterPayments/PlatformPaymentsPage";
import { AdminsPage } from "../../features/masterUsers/AdminsPage";
import { MasterAdminsRedirect } from "./redirects";
import { MasterSettingsPage } from "../../features/masterSettings/MasterSettingsPage";
import type { RoleArea } from "./types";

export const masterArea: RoleArea = {
  basePath: "/master",
  routes: [
    { path: "dashboard", component: MasterDashboardPage, nav: { label: "Início", icon: House } },
    { path: "condominiums", component: CondominiumsPage, nav: { label: "Condomínios", icon: Building2 } },
    { path: "payments", component: PlatformPaymentsPage, nav: { label: "Pagamentos", icon: Receipt } },
    { path: "admins", component: AdminsPage, nav: { label: "Administradores", icon: Users } },
    { path: "users", component: MasterAdminsRedirect },
    { path: "invitations", component: MasterAdminsRedirect },
    { path: "settings", component: MasterSettingsPage, nav: { label: "Ajustes", icon: SlidersHorizontal, placement: "footer" } },
  ],
};
