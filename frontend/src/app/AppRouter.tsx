import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { LoginPage } from "../features/auth/LoginPage";
import { AppLayout } from "../shared/layout/AppLayout";
import { ResidentSettingsPage } from "../features/residentSettings/ResidentSettingsPage";
import { ResidentDashboardPage } from "../features/residentDashboard/ResidentDashboardPage";

export function AppRouter() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<LoginPage />} />

                <Route path="/resident" element={<AppLayout />}>
                    <Route path="dashboard" element={<ResidentDashboardPage />} />
                    <Route path="settings" element={<ResidentSettingsPage />} />
                </Route>

                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
        </BrowserRouter>
    )
}