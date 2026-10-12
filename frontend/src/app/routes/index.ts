import { adminArea } from "./admin";
import { masterArea } from "./master";
import { residentArea } from "./resident";
import { syndicArea } from "./syndic";
import type { RoleArea } from "./types";

export type AreaRole = "Master" | "Admin" | "Syndic" | "Resident";

export const roleAreas: Record<AreaRole, RoleArea> = {
  Master: masterArea,
  Admin: adminArea,
  Syndic: syndicArea,
  Resident: residentArea,
};
