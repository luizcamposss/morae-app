import { Briefcase, Building, Building2, CalendarCheck, CalendarDays, DoorOpen, FileSpreadsheet, FileText, House, KeyRound, Mail, Megaphone, SlidersHorizontal, TriangleAlert, Users, Vote, Wallet, Wrench } from "lucide-react";
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
import { AdminReservationsPage } from "../../features/adminReservations/AdminReservationsPage";
import { AdminVisitsPage } from "../../features/adminVisits/AdminVisitsPage";
import { DocumentsPage } from "../../features/documents/DocumentsPage";
import { ExpensesPage } from "../../features/expenses/ExpensesPage";
import { MonthlyBalancePage } from "../../features/expenses/MonthlyBalancePage";
import { ImportPage } from "../../features/spreadsheetImport/ImportPage";
import { AdminOccurrencesPage } from "../../features/adminOccurrences/AdminOccurrencesPage";
import { FinanceHome } from "../../features/finance/FinanceHome";
import { redirectTo } from "../../features/finance/redirectTo";
import { RentalsPage } from "../../features/rentals/RentalsPage";
import { UtilitiesPage } from "../../features/consumption/UtilitiesPage";
import { ReportsPage } from "../../features/reports/ReportsPage";
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
    { path: "documents", component: DocumentsPage, nav: { label: "Documentos", icon: FileText }, module: "documents" },
    // "Financeiro": monthly bills, receivables, expenses and balance as tabs of one menu entry.
    { path: "rentals", component: RentalsPage, nav: { label: "Aluguéis", icon: KeyRound }, module: "rentals" },
    // Out of the menu for now (Luiz, 2026-11-15): the month sheet opens from Financeiro → Resumo.
    { path: "utilities", component: UtilitiesPage, module: "consumption" },
    { path: "finance", component: FinanceHome, nav: { label: "Financeiro", icon: Wallet } },
    { path: "finance/accounts", component: AdminPaymentsPage },
    { path: "finance/receivables", component: redirectTo("/admin/finance/accounts") },
    { path: "finance/expenses", component: ExpensesPage, module: "expenses" },
    { path: "finance/balance", component: MonthlyBalancePage, module: "expenses" },
    { path: "finance/reports", component: ReportsPage },
    { path: "readings", component: redirectTo("/admin/utilities") },
    { path: "payments", component: redirectTo("/admin/finance/accounts") },
    { path: "expenses", component: redirectTo("/admin/finance/expenses") },
    { path: "balance", component: redirectTo("/admin/finance/balance") },
    { path: "occurrences", component: AdminOccurrencesPage, nav: { label: "Ocorrências", icon: TriangleAlert }, module: "occurrences" },
    { path: "news", component: AdminNewsPage, nav: { label: "Avisos", icon: Megaphone } },
    { path: "assemblies", component: AdminAssembliesPage, nav: { label: "Assembleias", icon: Vote }, module: "assemblies" },
    { path: "assemblies/:id", component: AdminAssemblyDetailPage, module: "assemblies" },
    { path: "reservations", component: AdminReservationsPage, nav: { label: "Reservas", icon: CalendarCheck }, module: "reservations" },
    { path: "agenda", component: AgendaPage, nav: { label: "Agenda", icon: CalendarDays }, module: ["maintenance", "visitors", "occurrences", "reservations"] },
    { path: "preventive-maintenance", component: PreventiveMaintenancePage, nav: { label: "Manutenção", icon: Wrench }, module: "maintenance" },
    { path: "visitors", component: AdminVisitsPage, nav: { label: "Visitantes", icon: DoorOpen }, module: "visitors" },
    { path: "import", component: ImportPage, nav: { label: "Importar", icon: FileSpreadsheet, placement: "footer" } },
    { path: "setup", component: AdminSetupPage },
    { path: "settings", component: AdminSettingsPage, nav: { label: "Ajustes", icon: SlidersHorizontal, placement: "footer" } },
  ],
};
