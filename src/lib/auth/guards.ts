import { redirect } from "next/navigation";

import { routes } from "@/lib/constants/routes";
import { getAuthenticatedUserContext } from "@/lib/auth/queries";
import { getDefaultPathForRole, type AppRole } from "@/lib/auth/roles";

export async function getOptionalUserContext() {
  return getAuthenticatedUserContext();
}

export async function requireAuthenticatedUser() {
  const context = await getAuthenticatedUserContext();

  if (!context) {
    redirect(routes.login);
  }

  if (!context.isActive) {
    redirect(routes.unauthorized);
  }

  return context;
}

export async function requireRole(role: AppRole) {
  const context = await requireAuthenticatedUser();

  if (context.role !== role) {
    redirect(getDefaultPathForRole(context.role));
  }

  return context;
}
