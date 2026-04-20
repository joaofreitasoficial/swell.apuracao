import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { requireRole } from "@/lib/auth/guards";
import { routes } from "@/lib/constants/routes";

const navigationItems = [
  {
    href: routes.app,
    label: "Dashboard",
  },
  {
    href: routes.clients,
    label: "Clientes",
  },
  {
    href: routes.newClient,
    label: "Novo cliente",
  },
];

export default async function UserAppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireRole("user");

  return (
    <AppShell areaLabel="Operacao" navigationItems={navigationItems} user={user}>
      {children}
    </AppShell>
  );
}
