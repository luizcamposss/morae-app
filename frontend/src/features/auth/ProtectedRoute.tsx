import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../app/providers/useAuth";
import { PageLoader } from "../../shared/components/PageLoader";

export function ProtectedRoute() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <PageLoader message="Validando acesso…" />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Suspended account or inactive condominium: only the paused page, except that the Admin
  // can still see and pay the Moraê subscription (docs/ai/decisions.md → Papéis e permissões).
  const isPaused = user?.isSuspended || user?.isCondominiumInactive;
  const canStillPay =
    user?.isCondominiumInactive && user.roles.includes("Admin") && (location.pathname.startsWith("/admin/payments") || location.pathname.startsWith("/admin/finance/receivables"));

  if (isPaused && !canStillPay && location.pathname !== "/suspended") {
    return <Navigate to="/suspended" replace />;
  }

  return <Outlet />;
}
