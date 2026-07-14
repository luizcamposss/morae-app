export function getDefaultRouteByRoles(roles: string[]) {
  if (roles.includes("Master")) {
    return "/master/dashboard";
  }

  if (roles.includes("Admin")) {
    return "/admin/dashboard";
  }

  if (roles.includes("Syndic")) {
    return "/syndic/dashboard";
  }

  return "/resident/dashboard";
}