import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../app/providers/useAuth";
import { getDefaultRouteByRoles } from "./authRedirect";
import { PageLoader } from "../../shared/components/PageLoader";

export function PublicRoute() {
    const { user, isAuthenticated, isLoading } = useAuth();
    if (isLoading) {
        return <PageLoader message="Preparando sua entrada..." />;
    }

    if (isAuthenticated && user) {
        const defaultRoute = getDefaultRouteByRoles(user.roles);
        return <Navigate to={defaultRoute} replace />;
    }

    return <Outlet />;
}
