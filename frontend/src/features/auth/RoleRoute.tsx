import { Navigate, Outlet } from "react-router-dom";
import { PageLoader } from "../../shared/components/PageLoader";
import { useAuth } from "../../app/providers/useAuth";
import { getDefaultRouteByRoles } from "./authRedirect";
import { hasRequiredRole } from "./roleGuard";

type RoleRouteProps = {
  allowedRoles: string[];
};

export function RoleRoute({ allowedRoles }: RoleRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <PageLoader message="Validando permissao..." />;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  const isAllowed = hasRequiredRole(user.roles, allowedRoles);

  if (!isAllowed) {
    const fallbackRoute = getDefaultRouteByRoles(user.roles);
    return <Navigate to={fallbackRoute} replace />;
  }

  return <Outlet />;
}