import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { LoginPage } from "../features/auth/LoginPage";
import { ForgotPasswordPage } from "../features/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "../features/auth/ResetPasswordPage";
import { AppLayout } from "../shared/layout/AppLayout";
import { ProtectedRoute } from "../features/auth/ProtectedRoute";
import { SuspendedAccessPage } from "../features/auth/SuspendedAccessPage";
import { PublicRoute } from "../features/auth/PublicRoute";
import { RoleRoute } from "../features/auth/RoleRoute";
import { AcceptInvitationPage } from "../features/invitations/AcceptInvitationPage";
import { MercadoPagoOAuthReturnPage } from "../features/mercadoPago/MercadoPagoOAuthReturnPage";
import { SyndicAccessProvider } from "../features/syndicAccess/SyndicAccessProvider";
import { SyndicAccessRoute } from "../features/syndicAccess/SyndicAccessRoute";
import { roleAreas, type AreaRole } from "./routes";
import type { AppRoute } from "./routes/types";

export function AppRouter() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/accept-invitation/:token" element={<AcceptInvitationPage />} />
                {/* Reachable even when signed in: the e-mail link always works. */}
                <Route path="/reset-password" element={<ResetPasswordPage />} />

                <Route element={<PublicRoute />}>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                </Route>

                <Route element={<ProtectedRoute />}>
                    <Route path="/suspended" element={<SuspendedAccessPage />} />
                    <Route path="/mercadopago/return" element={<MercadoPagoOAuthReturnPage />} />

                    {areaRoute("Master")}
                    {areaRoute("Admin")}

                    <Route element={<SyndicAccessProvider />}>
                        {areaRoute("Syndic")}
                    </Route>

                    {areaRoute("Resident")}
                </Route>

                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
        </BrowserRouter>
    )
}

// Each role area (layout + its screens) comes from the registries in app/routes.
function areaRoute(role: AreaRole) {
    const area = roleAreas[role];

    return (
        <Route element={<RoleRoute allowedRoles={[role]} />}>
            <Route path={area.basePath} element={<AppLayout />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                {area.routes.map((route) => (
                    <Route key={route.path} path={route.path} element={renderScreen(route)} />
                ))}
            </Route>
        </Route>
    );
}

function renderScreen({ component: Screen, syndicAccess }: AppRoute) {
    if (!syndicAccess) {
        return <Screen />;
    }

    return (
        <SyndicAccessRoute accessKey={syndicAccess}>
            <Screen />
        </SyndicAccessRoute>
    );
}
