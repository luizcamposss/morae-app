import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { PageLoader } from "../../shared/components/PageLoader";
import { hasSyndicAccess, type SyndicAccessRequirement } from "./syndicAccessService";
import { useSyndicAccess } from "./useSyndicAccess";

type SyndicAccessRouteProps = {
  requirement: SyndicAccessRequirement;
  // Shown on the Início notice when the screen is blocked, e.g. "Financeiro".
  screenName?: string;
  children: ReactNode;
};

// Blocks a syndic screen opened by URL when the Admin has not granted that permission:
// sends the syndic back to the Início, which explains why.
export function SyndicAccessRoute({ requirement, screenName, children }: SyndicAccessRouteProps) {
  const access = useSyndicAccess();

  if (access === null) {
    return <PageLoader message="Validando permissão…" />;
  }

  if (!hasSyndicAccess(access, requirement)) {
    return <Navigate to="/syndic/dashboard" replace state={{ deniedScreen: screenName ?? "essa tela" }} />;
  }

  return children;
}
