import type { ComponentType } from "react";
import type { LucideIcon } from "lucide-react";
import type { ModuleRequirement } from "../../features/modules/modules";
import type { SyndicAccessRequirement } from "../../features/syndicAccess/syndicAccessService";

// One entry per screen of a role area. Entries with `nav` also appear in the side menu, in this order.
export type AppRoute = {
  path: string;
  component: ComponentType;
  // `shortLabel` replaces the label in the phone tab bar, where space is tight.
  nav?: { label: string; shortLabel?: string; icon: LucideIcon; placement?: "footer" };
  // Syndic only: area (or single permission) needed to open the screen and to see it in the menu.
  syndicAccess?: SyndicAccessRequirement;
  // Module the screen belongs to: hidden from the menu (and blocked) while the condominium has it off.
  module?: ModuleRequirement;
  // Resident screens only for owners who rent out a unit in the active condominium.
  ownRentalsOnly?: boolean;
  // Management screens only for an Admin/síndico who also owns a unit there ("Meus aluguéis").
  unitOwnerOnly?: boolean;
};

export type RoleArea = {
  basePath: string;
  routes: AppRoute[];
};
