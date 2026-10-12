import { Building2, House, Mail, Receipt, SlidersHorizontal, Users } from "lucide-react";
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
    { path: "dashboard", component: MasterDashboardPage, nav: { label: "Início", icon: House } },
    { path: "condominiums", component: CondominiumsPage, nav: { label: "Condomínios", icon: Building2 } },
    { path: "invitations", component: MasterInvitationsPage, nav: { label: "Convites", icon: Mail } },
    { path: "payments", component: PlatformPaymentsPage, nav: { label: "Pagamentos", icon: Receipt } },
    { path: "users", component: UsersPage, nav: { label: "Usuários", icon: Users } },
    { path: "settings", component: MasterSettingsPage, nav: { label: "Ajustes", icon: SlidersHorizontal, placement: "footer" } },
  ],
};
