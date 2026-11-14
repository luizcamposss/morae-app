import { CalendarCheck, DoorOpen, House, Megaphone, Receipt, SlidersHorizontal, TriangleAlert, UserPlus, Vote } from "lucide-react";
import { ResidentDashboardPage } from "../../features/residentDashboard/ResidentDashboardPage";
import { ResidentUnitPage } from "../../features/residentUnit/ResidentUnitPage";
import { ResidentBillsPage } from "../../features/residentBills/ResidentBillsPage";
import { ResidentOccurrencesPage } from "../../features/residentOccurrences/ResidentOccurrencesPage";
import { ResidentDocumentsRedirect, ResidentNoticeBoardPage } from "../../features/residentNoticeBoard/ResidentNoticeBoardPage";
import { ResidentAssembliesPage } from "../../features/residentAssemblies/ResidentAssembliesPage";
import { ResidentAssemblyDetailPage } from "../../features/residentAssemblies/ResidentAssemblyDetailPage";
import { ResidentReservationsPage } from "../../features/residentReservations/ResidentReservationsPage";
import { ResidentVisitsPage } from "../../features/residentVisits/ResidentVisitsPage";
import { ResidentSettingsPage } from "../../features/residentSettings/ResidentSettingsPage";
import type { RoleArea } from "./types";

export const residentArea: RoleArea = {
  basePath: "/resident",
  routes: [
    { path: "dashboard", component: ResidentDashboardPage, nav: { label: "Início", icon: House } },
    { path: "unit", component: ResidentUnitPage, nav: { label: "Minha unidade", icon: DoorOpen } },
    { path: "bills", component: ResidentBillsPage, nav: { label: "Boletos", icon: Receipt } },
    { path: "occurrences", component: ResidentOccurrencesPage, nav: { label: "Ocorrências", icon: TriangleAlert } },
    { path: "visits", component: ResidentVisitsPage, nav: { label: "Visitas", icon: UserPlus } },
    { path: "reservations", component: ResidentReservationsPage, nav: { label: "Reservas", icon: CalendarCheck } },
    { path: "notices", component: ResidentNoticeBoardPage, nav: { label: "Avisos e documentos", shortLabel: "Avisos", icon: Megaphone } },
    { path: "documents", component: ResidentDocumentsRedirect },
    { path: "assemblies", component: ResidentAssembliesPage, nav: { label: "Assembleias", icon: Vote } },
    { path: "assemblies/:id", component: ResidentAssemblyDetailPage },
    { path: "settings", component: ResidentSettingsPage, nav: { label: "Ajustes", icon: SlidersHorizontal, placement: "footer" } },
  ],
};
