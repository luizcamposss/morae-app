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

export const roleLabels: Record<AreaRole, string> = {
  Master: "Master",
  Admin: "Administração",
  Syndic: "Síndico",
  Resident: "Morador",
};

// A user with several roles lands in the highest one.
export function getPrimaryRole(roles: string[]): AreaRole {
  if (roles.includes("Master")) return "Master";
  if (roles.includes("Admin")) return "Admin";
  if (roles.includes("Syndic")) return "Syndic";
  return "Resident";
}
