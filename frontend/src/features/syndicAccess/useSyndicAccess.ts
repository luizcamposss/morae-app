import { useContext } from "react";
import { SyndicAccessContext } from "./SyndicAccessContext";
import { hasSyndicAccess, type SyndicAccessRequirement } from "./syndicAccessService";

export function useSyndicAccess() {
  return useContext(SyndicAccessContext);
}

// True when the screen is rendered inside the syndic area (Admin screens reused by the syndic).
export function useIsSyndicArea() {
  return useSyndicAccess() !== undefined;
}

// Outside the syndic area (Admin) every action is allowed; inside it, the syndic needs the permission.
export function useSyndicCan(requirement: SyndicAccessRequirement) {
  const access = useSyndicAccess();
  return access === undefined || hasSyndicAccess(access, requirement);
}
