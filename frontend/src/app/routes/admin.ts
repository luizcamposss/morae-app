import { Building, Building2, DoorOpen, FileText, House, Mail, Megaphone, Receipt, SlidersHorizontal, TriangleAlert, Users, Wrench } from "lucide-react";
import { AdminDashboardPage } from "../../features/adminDashboard/AdminDashboardPage";
import { AdminNewsPage } from "../../features/adminNews/AdminNewsPage";
import { BuildingsPage } from "../../features/buildings/BuildingsPage";
import { UnitsPage } from "../../features/units/UnitsPage";
import { PeoplePage } from "../../features/persons/PeoplePage";
import { InvitationsPage } from "../../features/invitations/InvitationsPage";
import { AdminPaymentsPage } from "../../features/adminPayments/AdminPaymentsPage";
import { PreventiveMaintenancePage } from "../../features/maintenance/PreventiveMaintenancePage";
import { AdminSettingsPage } from "../../features/adminSettings/AdminSettingsPage";
import { AdminVisitsPage } from "../../features/adminVisits/AdminVisitsPage";
import { DocumentsPage } from "../../features/documents/DocumentsPage";
import { AdminOccurrencesPage } from "../../features/adminOccurrences/AdminOccurrencesPage";
import type { RoleArea } from "./types";

export const adminArea: RoleArea = {
  basePath: "/admin",
  routes: [
    { path: "dashboard", component: AdminDashboardPage, nav: { label: "Início", icon: House } },
    { path: "buildings", component: BuildingsPage, nav: { label: "Prédios", icon: Building2 } },
    { path: "units", component: UnitsPage, nav: { label: "Unidades", icon: Building } },
    { path: "people", component: PeoplePage, nav: { label: "Moradores", icon: Users } },
    { path: "invitations", component: InvitationsPage, nav: { label: "Convites", icon: Mail } },
    { path: "documents", component: DocumentsPage, nav: { label: "Documentos", icon: FileText } },
    { path: "payments", component: AdminPaymentsPage, nav: { label: "Pagamentos", icon: Receipt } },
    { path: "occurrences", component: AdminOccurrencesPage, nav: { label: "Ocorrências", icon: TriangleAlert } },
    { path: "news", component: AdminNewsPage, nav: { label: "Avisos", icon: Megaphone } },
    { path: "preventive-maintenance", component: PreventiveMaintenancePage, nav: { label: "Manutenção", icon: Wrench } },
    { path: "visitors", component: AdminVisitsPage, nav: { label: "Visitantes", icon: DoorOpen } },
    { path: "settings", component: AdminSettingsPage, nav: { label: "Ajustes", icon: SlidersHorizontal, placement: "footer" } },
  ],
};
