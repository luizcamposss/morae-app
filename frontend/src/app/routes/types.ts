import type { ComponentType } from "react";
import type { SyndicAccessKey } from "../../features/syndicAccess/syndicAccessService";

// One entry per screen of a role area. Entries with `nav` also appear in the side menu, in this order.
export type AppRoute = {
  path: string;
  component: ComponentType;
  nav?: { label: string; icon: string };
  // Syndic only: permission group needed to open the screen and to see it in the menu.
  syndicAccess?: SyndicAccessKey;
};

export type RoleArea = {
  basePath: string;
  routes: AppRoute[];
};
