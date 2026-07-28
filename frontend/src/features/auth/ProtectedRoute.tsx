import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../app/providers/useAuth";
import { PageLoader } from "../../shared/components/PageLoader";

export function ProtectedRoute() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <PageLoader message="Validando acesso..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.isSuspended && location.pathname !== "/suspended") {
    return <Navigate to="/suspended" replace />;
  }

  return <Outlet />;
}
