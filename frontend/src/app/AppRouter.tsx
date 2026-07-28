import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { LoginPage } from "../features/auth/LoginPage";
import { AppLayout } from "../shared/layout/AppLayout";
import { ProtectedRoute } from "../features/auth/ProtectedRoute";
import { SuspendedAccessPage } from "../features/auth/SuspendedAccessPage";
import { ResidentSettingsPage } from "../features/residentSettings/ResidentSettingsPage";
import { ResidentDashboardPage } from "../features/residentDashboard/ResidentDashboardPage";
import { PublicRoute } from "../features/auth/PublicRoute";
import { MasterDashboardPage } from "../features/masterDashboard/MasterDashboardPage";
import { AdminDashboardPage } from "../features/adminDashboard/AdminDashboardPage";
import { SyndicDashboardPage } from "../features/syndicDashboard/SyndicDashboardPage";
import { SyndicSettingsPage } from "../features/syndicSettings/SyndicSettingsPage";
import { SyndicCommunicationPage } from "../features/syndicCommunication/SyndicCommunicationPage";
import { SyndicFinancePage } from "../features/syndicFinance/SyndicFinancePage";
import { SyndicMaintenancePage } from "../features/syndicMaintenance/SyndicMaintenancePage";
import { RoleRoute } from "../features/auth/RoleRoute";
import { BuildingsPage } from "../features/buildings/BuildingsPage";
import { UnitsPage } from "../features/units/UnitsPage";
import { PeoplePage } from "../features/persons/PeoplePage";
import { InvitationsPage } from "../features/invitations/InvitationsPage";
import { AcceptInvitationPage } from "../features/invitations/AcceptInvitationPage";
import { MasterInvitationsPage } from "../features/invitations/MasterInvitationsPage";
import { CondominiumsPage } from "../features/masterCondominiums/CondominiumsPage";
import { PlatformPaymentsPage } from "../features/masterPayments/PlatformPaymentsPage";
import { UsersPage } from "../features/masterUsers/UsersPage";
import { MasterSettingsPage } from "../features/masterSettings/MasterSettingsPage";
import { AdminPaymentsPage } from "../features/adminPayments/AdminPaymentsPage";
import { AdminSettingsPage } from "../features/adminSettings/AdminSettingsPage";
import { SyndicResidentsPage } from "../features/syndicResidents/SyndicResidentsPage";
import { ResidentUnitPage } from "../features/residentUnit/ResidentUnitPage";
import { ResidentBillsPage } from "../features/residentBills/ResidentBillsPage";
import { ResidentNoticesPage } from "../features/residentNotices/ResidentNoticesPage";

export function AppRouter() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/accept-invitation/:token" element={<AcceptInvitationPage />} />

                <Route element={<PublicRoute />}>
                    <Route path="/login" element={<LoginPage />} />
                </Route>

                <Route element={<ProtectedRoute />}>
                    <Route path="/suspended" element={<SuspendedAccessPage />} />

                    <Route element={<RoleRoute allowedRoles={["Master"]} />}>
                        <Route path="/master" element={<AppLayout />}>
                            <Route path="dashboard" element={<MasterDashboardPage />} />
                            <Route path="condominiums" element={<CondominiumsPage />} />
                            <Route path="invitations" element={<MasterInvitationsPage />} />
                            <Route path="payments" element={<PlatformPaymentsPage />} />
                            <Route path="users" element={<UsersPage />} />
                            <Route path="settings" element={<MasterSettingsPage />} />
                        </Route>
                    </Route>

                    <Route element={<RoleRoute allowedRoles={["Admin"]} />}>
                        <Route path="/admin" element={<AppLayout />}>
                            <Route path="dashboard" element={<AdminDashboardPage />} />
                            <Route path="buildings" element={<BuildingsPage />} />
                            <Route path="units" element={<UnitsPage />} />
                            <Route path="people" element={<PeoplePage />} />
                            <Route path="invitations" element={<InvitationsPage />} />
                            <Route path="payments" element={<AdminPaymentsPage />} />
                            <Route path="settings" element={<AdminSettingsPage />} />
                        </Route>
                    </Route>

                    <Route element={<RoleRoute allowedRoles={["Syndic"]} />}>
                        <Route path="/syndic" element={<AppLayout />}>
                            <Route path="dashboard" element={<SyndicDashboardPage />} />
                            <Route path="residents" element={<SyndicResidentsPage />} />
                            <Route path="finance" element={<SyndicFinancePage />} />
                            <Route path="communication" element={<SyndicCommunicationPage />} />
                            <Route path="maintenance" element={<SyndicMaintenancePage />} />
                            <Route path="settings" element={<SyndicSettingsPage />} />
                        </Route>
                    </Route>

                    <Route element={<RoleRoute allowedRoles={["Resident"]} />}>
                        <Route path="/resident" element={<AppLayout />}>
                            <Route path="dashboard" element={<ResidentDashboardPage />} />
                            <Route path="unit" element={<ResidentUnitPage />} />
                            <Route path="bills" element={<ResidentBillsPage />} />
                            <Route path="notices" element={<ResidentNoticesPage />} />
                            <Route path="settings" element={<ResidentSettingsPage />} />
                        </Route>
                    </Route>
                </Route>

                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
        </BrowserRouter>
    )
}
