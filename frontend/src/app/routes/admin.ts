import { Building, Building2, House, Mail, Megaphone, Receipt, SlidersHorizontal, Users } from "lucide-react";
import { AdminDashboardPage } from "../../features/adminDashboard/AdminDashboardPage";
import { AdminNewsPage } from "../../features/adminNews/AdminNewsPage";
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
    { path: "dashboard", component: AdminDashboardPage, nav: { label: "Início", icon: House } },
    { path: "buildings", component: BuildingsPage, nav: { label: "Prédios", icon: Building2 } },
    { path: "units", component: UnitsPage, nav: { label: "Unidades", icon: Building } },
    { path: "people", component: PeoplePage, nav: { label: "Moradores", icon: Users } },
    { path: "invitations", component: InvitationsPage, nav: { label: "Convites", icon: Mail } },
    { path: "payments", component: AdminPaymentsPage, nav: { label: "Pagamentos", icon: Receipt } },
    { path: "news", component: AdminNewsPage, nav: { label: "Avisos", icon: Megaphone } },
    { path: "settings", component: AdminSettingsPage, nav: { label: "Ajustes", icon: SlidersHorizontal, placement: "footer" } },
  ],
};
