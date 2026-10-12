import { MasterDashboardPage } from "../../features/masterDashboard/MasterDashboardPage";
import { CondominiumsPage } from "../../features/masterCondominiums/CondominiumsPage";
import { MasterInvitationsPage } from "../../features/invitations/MasterInvitationsPage";
import { PlatformPaymentsPage } from "../../features/masterPayments/PlatformPaymentsPage";
import { UsersPage } from "../../features/masterUsers/UsersPage";
import { MasterSettingsPage } from "../../features/masterSettings/MasterSettingsPage";
import type { RoleArea } from "./types";

export const masterArea: RoleArea = {
  basePath: "/master",
  routes: [
    { path: "dashboard", component: MasterDashboardPage, nav: { label: "Dashboard", icon: "dashboard" } },
    { path: "condominiums", component: CondominiumsPage, nav: { label: "Condomínios", icon: "predio" } },
    { path: "invitations", component: MasterInvitationsPage, nav: { label: "Convites", icon: "envelope-2" } },
    { path: "payments", component: PlatformPaymentsPage, nav: { label: "Pagamentos", icon: "boleto" } },
    { path: "users", component: UsersPage, nav: { label: "Usuários", icon: "usuarios" } },
    { path: "settings", component: MasterSettingsPage, nav: { label: "Configurações", icon: "engrenagem" } },
  ],
};
