import { House, Megaphone, Receipt, SlidersHorizontal, TriangleAlert, Users } from "lucide-react";
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
    { path: "dashboard", component: SyndicDashboardPage, nav: { label: "Início", icon: House } },
    { path: "residents", component: SyndicResidentsPage, nav: { label: "Moradores", icon: Users }, syndicAccess: "residents" },
    { path: "finance", component: SyndicFinancePage, nav: { label: "Financeiro", icon: Receipt }, syndicAccess: "finance" },
    { path: "communication", component: SyndicCommunicationPage, nav: { label: "Comunicados", icon: Megaphone }, syndicAccess: "communication" },
    { path: "maintenance", component: SyndicMaintenancePage, nav: { label: "Ocorrências", icon: TriangleAlert }, syndicAccess: "maintenance" },
    { path: "settings", component: SyndicSettingsPage, nav: { label: "Ajustes", icon: SlidersHorizontal, placement: "footer" } },
  ],
};
