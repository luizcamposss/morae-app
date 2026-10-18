import type { ComponentType } from "react";
import type { LucideIcon } from "lucide-react";
import type { SyndicAccessKey } from "../../features/syndicAccess/syndicAccessService";

// One entry per screen of a role area. Entries with `nav` also appear in the side menu, in this order.
export type AppRoute = {
  path: string;
  component: ComponentType;
  // `shortLabel` replaces the label in the phone tab bar, where space is tight.
  nav?: { label: string; shortLabel?: string; icon: LucideIcon; placement?: "footer" };
  // Syndic only: permission group needed to open the screen and to see it in the menu.
  syndicAccess?: SyndicAccessKey;
};

export type RoleArea = {
  basePath: string;
  routes: AppRoute[];
};
