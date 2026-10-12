import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { PageLoader } from "../../shared/components/PageLoader";
import type { SyndicAccessKey } from "./syndicAccessService";
import { useSyndicAccess } from "./useSyndicAccess";

type SyndicAccessRouteProps = {
  accessKey: SyndicAccessKey;
  children: ReactNode;
};

// Blocks a syndic screen opened by URL when the Admin has not granted that permission.
export function SyndicAccessRoute({ accessKey, children }: SyndicAccessRouteProps) {
  const access = useSyndicAccess();

  if (access === null) {
    return <PageLoader message="Validando permissão…" />;
  }

  if (!access?.[accessKey]) {
    return <Navigate to="/syndic/dashboard" replace />;
  }

  return children;
}
