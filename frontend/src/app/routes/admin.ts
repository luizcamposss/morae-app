import { Briefcase, Building, Building2, CalendarDays, DoorOpen, FileSpreadsheet, FileText, House, Mail, Megaphone, Receipt, SlidersHorizontal, TriangleAlert, Users, Vote, Wrench } from "lucide-react";
import { AdminAssembliesPage } from "../../features/adminAssemblies/AdminAssembliesPage";
import { AdminAssemblyDetailPage } from "../../features/adminAssemblies/AdminAssemblyDetailPage";
import { AdminDashboardPage } from "../../features/adminDashboard/AdminDashboardPage";
import { AdminPortfolioPage } from "../../features/adminPortfolio/AdminPortfolioPage";
import { AdminNewsPage } from "../../features/adminNews/AdminNewsPage";
import { BuildingsPage } from "../../features/buildings/BuildingsPage";
import { UnitsPage } from "../../features/units/UnitsPage";
import { PeoplePage } from "../../features/persons/PeoplePage";
import { InvitationsPage } from "../../features/invitations/InvitationsPage";
import { AdminPaymentsPage } from "../../features/adminPayments/AdminPaymentsPage";
import { PreventiveMaintenancePage } from "../../features/maintenance/PreventiveMaintenancePage";
import { AgendaPage } from "../../features/agenda/AgendaPage";
import { AdminSettingsPage } from "../../features/adminSettings/AdminSettingsPage";
import { AdminSetupPage } from "../../features/adminSetup/AdminSetupPage";
import { AdminVisitsPage } from "../../features/adminVisits/AdminVisitsPage";
import { DocumentsPage } from "../../features/documents/DocumentsPage";
import { ImportPage } from "../../features/spreadsheetImport/ImportPage";
import { AdminOccurrencesPage } from "../../features/adminOccurrences/AdminOccurrencesPage";
import type { RoleArea } from "./types";

export const adminArea: RoleArea = {
  basePath: "/admin",
  routes: [
    { path: "dashboard", component: AdminDashboardPage, nav: { label: "Início", icon: House } },
    { path: "portfolio", component: AdminPortfolioPage, nav: { label: "Carteira", icon: Briefcase } },
    { path: "buildings", component: BuildingsPage, nav: { label: "Prédios", icon: Building2 } },
    { path: "units", component: UnitsPage, nav: { label: "Unidades", icon: Building } },
    { path: "people", component: PeoplePage, nav: { label: "Moradores", icon: Users } },
    { path: "invitations", component: InvitationsPage, nav: { label: "Convites", icon: Mail } },
    { path: "documents", component: DocumentsPage, nav: { label: "Documentos", icon: FileText } },
    { path: "payments", component: AdminPaymentsPage, nav: { label: "Pagamentos", icon: Receipt } },
    { path: "occurrences", component: AdminOccurrencesPage, nav: { label: "Ocorrências", icon: TriangleAlert } },
    { path: "news", component: AdminNewsPage, nav: { label: "Avisos", icon: Megaphone } },
    { path: "assemblies", component: AdminAssembliesPage, nav: { label: "Assembleias", icon: Vote } },
    { path: "assemblies/:id", component: AdminAssemblyDetailPage },
    { path: "agenda", component: AgendaPage, nav: { label: "Agenda", icon: CalendarDays } },
    { path: "preventive-maintenance", component: PreventiveMaintenancePage, nav: { label: "Manutenção", icon: Wrench } },
    { path: "visitors", component: AdminVisitsPage, nav: { label: "Visitantes", icon: DoorOpen } },
    { path: "import", component: ImportPage, nav: { label: "Importar", icon: FileSpreadsheet, placement: "footer" } },
    { path: "setup", component: AdminSetupPage },
    { path: "settings", component: AdminSettingsPage, nav: { label: "Ajustes", icon: SlidersHorizontal, placement: "footer" } },
  ],
};
