export function hasRequiredRole(
  userRoles: string[],
  allowedRoles: string[],
) {
  return allowedRoles.some((role) => userRoles.includes(role));
}