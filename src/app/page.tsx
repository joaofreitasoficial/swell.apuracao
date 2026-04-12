import { redirect } from "next/navigation";

import { getOptionalUserContext } from "@/lib/auth/guards";
import { getDefaultPathForRole } from "@/lib/auth/roles";
import { routes } from "@/lib/constants/routes";

export default async function Home() {
  const context = await getOptionalUserContext();

  if (!context) {
    redirect(routes.login);
  }

  redirect(getDefaultPathForRole(context.role));
}
