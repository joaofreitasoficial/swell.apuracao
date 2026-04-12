import { routes } from "@/lib/constants/routes";

export const appRoles = ["super_admin", "user"] as const;

export type AppRole = (typeof appRoles)[number];

export function getDefaultPathForRole(role: AppRole) {
  return role === "super_admin" ? routes.superAdmin : routes.app;
}
