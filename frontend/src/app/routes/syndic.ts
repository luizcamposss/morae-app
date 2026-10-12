import { SyndicDashboardPage } from "../../features/syndicDashboard/SyndicDashboardPage";
import { SyndicResidentsPage } from "../../features/syndicResidents/SyndicResidentsPage";
import { SyndicFinancePage } from "../../features/syndicFinance/SyndicFinancePage";
import { SyndicCommunicationPage } from "../../features/syndicCommunication/SyndicCommunicationPage";
import { SyndicMaintenancePage } from "../../features/syndicMaintenance/SyndicMaintenancePage";
import { SyndicSettingsPage } from "../../features/syndicSettings/SyndicSettingsPage";
import type { RoleArea } from "./types";

export const syndicArea: RoleArea = {
  basePath: "/syndic",
  routes: [
    { path: "dashboard", component: SyndicDashboardPage, nav: { label: "Dashboard", icon: "dashboard" } },
    { path: "residents", component: SyndicResidentsPage, nav: { label: "Moradores", icon: "usuarios" }, syndicAccess: "residents" },
    { path: "finance", component: SyndicFinancePage, nav: { label: "Financeiro", icon: "boleto" }, syndicAccess: "finance" },
    { path: "communication", component: SyndicCommunicationPage, nav: { label: "Comunicados", icon: "envelope-2" }, syndicAccess: "communication" },
    { path: "maintenance", component: SyndicMaintenancePage, nav: { label: "Ocorrências", icon: "atencao" }, syndicAccess: "maintenance" },
    { path: "settings", component: SyndicSettingsPage, nav: { label: "Configurações", icon: "engrenagem" } },
  ],
};
