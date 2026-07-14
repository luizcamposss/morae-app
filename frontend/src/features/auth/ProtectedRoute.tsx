import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../app/providers/useAuth";
import { PageLoader } from "../../shared/components/PageLoader";

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <PageLoader message="Validando acesso..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
