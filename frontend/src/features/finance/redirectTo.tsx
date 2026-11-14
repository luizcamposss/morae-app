import { Navigate, useLocation } from "react-router-dom";

// Old addresses (e-mails and notifications already sent) keep working: same query string and state.
export function redirectTo(path: string) {
  return function RedirectKeepingQuery() {
    const location = useLocation();
    return <Navigate to={{ pathname: path, search: location.search }} state={location.state} replace />;
  };
}
