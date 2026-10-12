import { AdminDashboardPage } from "../../features/adminDashboard/AdminDashboardPage";
import { BuildingsPage } from "../../features/buildings/BuildingsPage";
import { UnitsPage } from "../../features/units/UnitsPage";
import { PeoplePage } from "../../features/persons/PeoplePage";
import { InvitationsPage } from "../../features/invitations/InvitationsPage";
import { AdminPaymentsPage } from "../../features/adminPayments/AdminPaymentsPage";
import { AdminSettingsPage } from "../../features/adminSettings/AdminSettingsPage";
import type { RoleArea } from "./types";

export const adminArea: RoleArea = {
  basePath: "/admin",
  routes: [
    { path: "dashboard", component: AdminDashboardPage, nav: { label: "Dashboard", icon: "dashboard" } },
    { path: "buildings", component: BuildingsPage, nav: { label: "Prédios", icon: "predio" } },
    { path: "units", component: UnitsPage, nav: { label: "Unidades", icon: "apartamento" } },
    { path: "people", component: PeoplePage, nav: { label: "Moradores", icon: "usuarios" } },
    { path: "invitations", component: InvitationsPage, nav: { label: "Convites", icon: "envelope-2" } },
    { path: "payments", component: AdminPaymentsPage, nav: { label: "Pagamentos", icon: "boleto" } },
    { path: "settings", component: AdminSettingsPage, nav: { label: "Configurações", icon: "engrenagem" } },
  ],
};
