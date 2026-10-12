import { Navigate } from "react-router-dom";

// Old Master addresses kept alive for saved links and notifications.
export function MasterAdminsRedirect() {
  return <Navigate to="/master/admins" replace />;
}
