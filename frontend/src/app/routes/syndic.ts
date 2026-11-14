import { CalendarDays, DoorOpen, FileText, House, Megaphone, Receipt, Scale, SlidersHorizontal, TriangleAlert, Users, Vote, Wallet, Wrench } from "lucide-react";
import { AdminAssembliesPage } from "../../features/adminAssemblies/AdminAssembliesPage";
import { AdminAssemblyDetailPage } from "../../features/adminAssemblies/AdminAssemblyDetailPage";
import { AdminNewsPage } from "../../features/adminNews/AdminNewsPage";
import { AdminOccurrencesPage } from "../../features/adminOccurrences/AdminOccurrencesPage";
import { AdminPaymentsPage } from "../../features/adminPayments/AdminPaymentsPage";
import { AgendaPage } from "../../features/agenda/AgendaPage";
import { AdminVisitsPage } from "../../features/adminVisits/AdminVisitsPage";
import { DocumentsPage } from "../../features/documents/DocumentsPage";
import { ExpensesPage } from "../../features/expenses/ExpensesPage";
import { MonthlyBalancePage } from "../../features/expenses/MonthlyBalancePage";
import { PreventiveMaintenancePage } from "../../features/maintenance/PreventiveMaintenancePage";
import { SyndicDashboardPage } from "../../features/syndicDashboard/SyndicDashboardPage";
import { SyndicResidentsPage } from "../../features/syndicResidents/SyndicResidentsPage";
import { SyndicSettingsPage } from "../../features/syndicSettings/SyndicSettingsPage";
import type { RoleArea } from "./types";

// The syndic reuses the Admin screens; the API limits the data to his buildings and permissions.
export const syndicArea: RoleArea = {
  basePath: "/syndic",
  routes: [
    { path: "dashboard", component: SyndicDashboardPage, nav: { label: "Início", icon: House } },
    { path: "residents", component: SyndicResidentsPage, nav: { label: "Moradores", icon: Users }, syndicAccess: "residents" },
    { path: "payments", component: AdminPaymentsPage, nav: { label: "Pagamentos", icon: Receipt }, syndicAccess: "finance" },
    { path: "expenses", component: ExpensesPage, nav: { label: "Despesas", icon: Wallet }, syndicAccess: "expenses.manage" },
    { path: "balance", component: MonthlyBalancePage, nav: { label: "Prestação de contas", shortLabel: "Contas", icon: Scale } },
    { path: "occurrences", component: AdminOccurrencesPage, nav: { label: "Ocorrências", icon: TriangleAlert }, syndicAccess: "maintenance" },
    { path: "news", component: AdminNewsPage, nav: { label: "Avisos", icon: Megaphone }, syndicAccess: "communication" },
    { path: "documents", component: DocumentsPage, nav: { label: "Documentos", icon: FileText }, syndicAccess: "documents.manage" },
    { path: "assemblies", component: AdminAssembliesPage, nav: { label: "Assembleias", icon: Vote }, syndicAccess: "assemblies.manage" },
    { path: "assemblies/:id", component: AdminAssemblyDetailPage, syndicAccess: "assemblies.manage" },
    { path: "agenda", component: AgendaPage, nav: { label: "Agenda", icon: CalendarDays }, syndicAccess: ["maintenance.manage", "visitors.manage", "maintenance"] },
    { path: "preventive-maintenance", component: PreventiveMaintenancePage, nav: { label: "Manutenção", icon: Wrench }, syndicAccess: "maintenance.manage" },
    { path: "visitors", component: AdminVisitsPage, nav: { label: "Visitantes", icon: DoorOpen }, syndicAccess: "visitors.manage" },
    { path: "settings", component: SyndicSettingsPage, nav: { label: "Ajustes", icon: SlidersHorizontal, placement: "footer" } },
  ],
};
