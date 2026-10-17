import { Building, Building2, FileText, House, Mail, Receipt, SlidersHorizontal, Users, Wrench } from "lucide-react";
import { AdminDashboardPage } from "../../features/adminDashboard/AdminDashboardPage";
import { BuildingsPage } from "../../features/buildings/BuildingsPage";
import { UnitsPage } from "../../features/units/UnitsPage";
import { PeoplePage } from "../../features/persons/PeoplePage";
import { InvitationsPage } from "../../features/invitations/InvitationsPage";
import { AdminPaymentsPage } from "../../features/adminPayments/AdminPaymentsPage";
import { PreventiveMaintenancePage } from "../../features/maintenance/PreventiveMaintenancePage";
import { AdminSettingsPage } from "../../features/adminSettings/AdminSettingsPage";
import { DocumentsPage } from "../../features/documents/DocumentsPage";
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
    { path: "preventive-maintenance", component: PreventiveMaintenancePage, nav: { label: "Manutenção", icon: Wrench } },
    { path: "settings", component: AdminSettingsPage, nav: { label: "Ajustes", icon: SlidersHorizontal, placement: "footer" } },
  ],
};
