import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { LoginPage } from "../features/auth/LoginPage";
import { AppLayout } from "../shared/layout/AppLayout";
import { ProtectedRoute } from "../features/auth/ProtectedRoute";
import { ResidentSettingsPage } from "../features/residentSettings/ResidentSettingsPage";
import { ResidentDashboardPage } from "../features/residentDashboard/ResidentDashboardPage";
import { PublicRoute } from "../features/auth/PublicRoute";
import { MasterDashboardPage } from "../features/masterDashboard/MasterDashboardPage";
import { AdminDashboardPage } from "../features/adminDashboard/AdminDashboardPage";
import { SyndicDashboardPage } from "../features/syndicDashboard/SyndicDashboardPage";
import { RoleRoute } from "../features/auth/RoleRoute";

export function AppRouter() {
    return (
        <BrowserRouter>
            <Routes>
                <Route element={<PublicRoute />}>
                    <Route path="/login" element={<LoginPage />} />
                </Route>

                <Route element={<ProtectedRoute />}>
                    <Route element={<RoleRoute allowedRoles={["Master"]} />}>
                        <Route path="/master" element={<AppLayout />}>
                            <Route path="dashboard" element={<MasterDashboardPage />} />
                        </Route>
                    </Route>

                    <Route element={<RoleRoute allowedRoles={["Admin"]} />}>
                        <Route path="/admin" element={<AppLayout />}>
                            <Route path="dashboard" element={<AdminDashboardPage />} />
                        </Route>
                    </Route>

                    <Route element={<RoleRoute allowedRoles={["Syndic"]} />}>
                        <Route path="/syndic" element={<AppLayout />}>
                            <Route path="dashboard" element={<SyndicDashboardPage />} />
                        </Route>
                    </Route>

                    <Route element={<RoleRoute allowedRoles={["Resident"]} />}>
                        <Route path="/resident" element={<AppLayout />}>
                            <Route path="dashboard" element={<ResidentDashboardPage />} />
                            <Route path="settings" element={<ResidentSettingsPage />} />
                        </Route>
                    </Route>
                </Route>

                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
        </BrowserRouter>
    )
}