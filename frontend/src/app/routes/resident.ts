import { DoorOpen, House, Megaphone, Receipt, SlidersHorizontal, TriangleAlert } from "lucide-react";
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
    { path: "dashboard", component: ResidentDashboardPage, nav: { label: "Início", icon: House } },
    { path: "unit", component: ResidentUnitPage, nav: { label: "Minha unidade", icon: DoorOpen } },
    { path: "bills", component: ResidentBillsPage, nav: { label: "Boletos", icon: Receipt } },
    { path: "occurrences", component: ResidentInspectionsPage, nav: { label: "Ocorrências", icon: TriangleAlert } },
    { path: "notices", component: ResidentNoticesPage, nav: { label: "Avisos", icon: Megaphone } },
    { path: "settings", component: ResidentSettingsPage, nav: { label: "Ajustes", icon: SlidersHorizontal, placement: "footer" } },
  ],
};
