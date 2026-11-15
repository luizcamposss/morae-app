import { CalendarCheck, CalendarDays, DoorOpen, FileText, Gauge, House, KeyRound, Megaphone, SlidersHorizontal, TriangleAlert, Users, Vote, Wallet, Wrench } from "lucide-react";
import { AdminAssembliesPage } from "../../features/adminAssemblies/AdminAssembliesPage";
import { AdminAssemblyDetailPage } from "../../features/adminAssemblies/AdminAssemblyDetailPage";
import { AdminNewsPage } from "../../features/adminNews/AdminNewsPage";
import { AdminOccurrencesPage } from "../../features/adminOccurrences/AdminOccurrencesPage";
import { AdminPaymentsPage } from "../../features/adminPayments/AdminPaymentsPage";
import { AgendaPage } from "../../features/agenda/AgendaPage";
import { AdminReservationsPage } from "../../features/adminReservations/AdminReservationsPage";
import { AdminVisitsPage } from "../../features/adminVisits/AdminVisitsPage";
import { DocumentsPage } from "../../features/documents/DocumentsPage";
import { ExpensesPage } from "../../features/expenses/ExpensesPage";
import { MonthlyBalancePage } from "../../features/expenses/MonthlyBalancePage";
import { PreventiveMaintenancePage } from "../../features/maintenance/PreventiveMaintenancePage";
import { SyndicDashboardPage } from "../../features/syndicDashboard/SyndicDashboardPage";
import { SyndicResidentsPage } from "../../features/syndicResidents/SyndicResidentsPage";
import { SyndicSettingsPage } from "../../features/syndicSettings/SyndicSettingsPage";
import { FinanceHome } from "../../features/finance/FinanceHome";
import { redirectTo } from "../../features/finance/redirectTo";
import { RentalsPage } from "../../features/rentals/RentalsPage";
import { UtilitiesPage } from "../../features/consumption/UtilitiesPage";
import { ReportsPage } from "../../features/reports/ReportsPage";
import type { RoleArea } from "./types";

// The syndic reuses the Admin screens; the API limits the data to his buildings and permissions.
export const syndicArea: RoleArea = {
  basePath: "/syndic",
  routes: [
    { path: "dashboard", component: SyndicDashboardPage, nav: { label: "Início", icon: House } },
    { path: "residents", component: SyndicResidentsPage, nav: { label: "Moradores", icon: Users }, syndicAccess: "residents" },
    { path: "rentals", component: RentalsPage, nav: { label: "Aluguéis", icon: KeyRound }, syndicAccess: "rentals.manage", module: "rentals" },
    { path: "utilities", component: UtilitiesPage, nav: { label: "Água, luz e gás", shortLabel: "Consumo", icon: Gauge }, syndicAccess: "finance", module: "consumption" },
    { path: "finance", component: FinanceHome, nav: { label: "Financeiro", icon: Wallet } },
    { path: "finance/accounts", component: AdminPaymentsPage, syndicAccess: "finance" },
    { path: "finance/receivables", component: redirectTo("/syndic/finance/accounts") },
    { path: "finance/expenses", component: ExpensesPage, syndicAccess: "expenses.manage", module: "expenses" },
    { path: "finance/balance", component: MonthlyBalancePage, module: "expenses" },
    { path: "finance/reports", component: ReportsPage },
    { path: "readings", component: redirectTo("/syndic/utilities") },
    { path: "payments", component: redirectTo("/syndic/finance/accounts") },
    { path: "expenses", component: redirectTo("/syndic/finance/expenses") },
    { path: "balance", component: redirectTo("/syndic/finance/balance") },
    { path: "occurrences", component: AdminOccurrencesPage, nav: { label: "Ocorrências", icon: TriangleAlert }, syndicAccess: "maintenance", module: "occurrences" },
    { path: "news", component: AdminNewsPage, nav: { label: "Avisos", icon: Megaphone }, syndicAccess: "communication" },
    { path: "documents", component: DocumentsPage, nav: { label: "Documentos", icon: FileText }, syndicAccess: "documents.manage", module: "documents" },
    { path: "assemblies", component: AdminAssembliesPage, nav: { label: "Assembleias", icon: Vote }, syndicAccess: "assemblies.manage", module: "assemblies" },
    { path: "assemblies/:id", component: AdminAssemblyDetailPage, syndicAccess: "assemblies.manage", module: "assemblies" },
    { path: "reservations", component: AdminReservationsPage, nav: { label: "Reservas", icon: CalendarCheck }, syndicAccess: "reservations.manage", module: "reservations" },
    { path: "agenda", component: AgendaPage, nav: { label: "Agenda", icon: CalendarDays }, syndicAccess: ["maintenance.manage", "visitors.manage", "maintenance", "reservations.manage"], module: ["maintenance", "visitors", "occurrences", "reservations"] },
    { path: "preventive-maintenance", component: PreventiveMaintenancePage, nav: { label: "Manutenção", icon: Wrench }, syndicAccess: "maintenance.manage", module: "maintenance" },
    { path: "visitors", component: AdminVisitsPage, nav: { label: "Visitantes", icon: DoorOpen }, syndicAccess: "visitors.manage", module: "visitors" },
    { path: "settings", component: SyndicSettingsPage, nav: { label: "Ajustes", icon: SlidersHorizontal, placement: "footer" } },
  ],
};
