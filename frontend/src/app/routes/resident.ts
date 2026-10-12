import { ResidentDashboardPage } from "../../features/residentDashboard/ResidentDashboardPage";
import { ResidentUnitPage } from "../../features/residentUnit/ResidentUnitPage";
import { ResidentBillsPage } from "../../features/residentBills/ResidentBillsPage";
import { ResidentInspectionsPage } from "../../features/residentInspections/ResidentInspectionsPage";
import { ResidentNoticesPage } from "../../features/residentNotices/ResidentNoticesPage";
import { ResidentSettingsPage } from "../../features/residentSettings/ResidentSettingsPage";
import type { RoleArea } from "./types";

export const residentArea: RoleArea = {
  basePath: "/resident",
  routes: [
    { path: "dashboard", component: ResidentDashboardPage, nav: { label: "Dashboard", icon: "dashboard" } },
    { path: "unit", component: ResidentUnitPage, nav: { label: "Minha unidade", icon: "apartamento" } },
    { path: "bills", component: ResidentBillsPage, nav: { label: "Boletos", icon: "boleto" } },
    { path: "occurrences", component: ResidentInspectionsPage, nav: { label: "Ocorrências", icon: "atencao" } },
    { path: "notices", component: ResidentNoticesPage, nav: { label: "Avisos", icon: "envelope-2" } },
    { path: "settings", component: ResidentSettingsPage, nav: { label: "Configurações", icon: "engrenagem" } },
  ],
};
