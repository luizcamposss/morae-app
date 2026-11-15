import { useAuth } from "../../app/providers/useAuth";
import { useCondominium } from "../../app/providers/useCondominium";
import { useSyndicAccess } from "../../features/syndicAccess/useSyndicAccess";
import { hasSyndicAccess } from "../../features/syndicAccess/syndicAccessService";
import { isModuleEnabled } from "../../features/modules/modules";
import { getPrimaryRole, roleAreas, type AreaRole } from "../../app/routes";
import type { LucideIcon } from "lucide-react";

export type MenuItem = {
  label: string;
  shortLabel?: string;
  icon: LucideIcon;
  to: string;
  placement?: "footer";
};

// Menu entries come from the role registries; a syndic only sees what the Admin allowed, and
// nobody sees the modules the condominium turned off.
function getMenuItems(
  role: AreaRole,
  syndicAccess: ReturnType<typeof useSyndicAccess>,
  enabledModules: string[] | undefined,
  hasOwnRentals: boolean,
): MenuItem[] {
  const area = roleAreas[role];

  return area.routes.flatMap(({ path, nav, syndicAccess: requirement, module, ownRentalsOnly }) => {
    if (
      !nav ||
      (requirement && !hasSyndicAccess(syndicAccess, requirement)) ||
      (module && !isModuleEnabled(enabledModules, module)) ||
      (ownRentalsOnly && !hasOwnRentals)
    ) {
      return [];
    }

    return [{ ...nav, to: `${area.basePath}/${path}` }];
  });
}

// The menu the signed-in user sees (also used by the tutorial to skip hidden screens).
export function useMenuItems() {
  const { user } = useAuth();
  const syndicAccess = useSyndicAccess();
  const primaryRole = getPrimaryRole(user?.roles ?? []);
  const { activeCondominium } = useCondominium();
  return { primaryRole, menuItems: getMenuItems(primaryRole, syndicAccess, activeCondominium?.enabledModules, Boolean(activeCondominium?.hasOwnRentalContracts)) };
}

