import { DoorOpen, House, Megaphone, Receipt, SlidersHorizontal, TriangleAlert, UserPlus } from "lucide-react";
import { ResidentDashboardPage } from "../../features/residentDashboard/ResidentDashboardPage";
import { ResidentUnitPage } from "../../features/residentUnit/ResidentUnitPage";
import { ResidentBillsPage } from "../../features/residentBills/ResidentBillsPage";
import { ResidentInspectionsPage } from "../../features/residentInspections/ResidentInspectionsPage";
import { ResidentDocumentsRedirect, ResidentNoticeBoardPage } from "../../features/residentNoticeBoard/ResidentNoticeBoardPage";
import { ResidentVisitsPage } from "../../features/residentVisits/ResidentVisitsPage";
import { ResidentSettingsPage } from "../../features/residentSettings/ResidentSettingsPage";
import type { RoleArea } from "./types";

export const residentArea: RoleArea = {
  basePath: "/resident",
  routes: [
    { path: "dashboard", component: ResidentDashboardPage, nav: { label: "Início", icon: House } },
    { path: "unit", component: ResidentUnitPage, nav: { label: "Minha unidade", icon: DoorOpen } },
    { path: "bills", component: ResidentBillsPage, nav: { label: "Boletos", icon: Receipt } },
    { path: "occurrences", component: ResidentInspectionsPage, nav: { label: "Ocorrências", icon: TriangleAlert } },
    { path: "visits", component: ResidentVisitsPage, nav: { label: "Visitas", icon: UserPlus } },
    { path: "notices", component: ResidentNoticeBoardPage, nav: { label: "Avisos e documentos", shortLabel: "Avisos", icon: Megaphone } },
    { path: "documents", component: ResidentDocumentsRedirect },
    { path: "settings", component: ResidentSettingsPage, nav: { label: "Ajustes", icon: SlidersHorizontal, placement: "footer" } },
  ],
};
