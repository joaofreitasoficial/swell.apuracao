import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { LayoutHeader } from "@/components/layout/layout-header";
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
    <AppShell areaLabel="Operação" navigationItems={navigationItems} user={user}>
      <LayoutHeader
        eyebrow="Operação"
        title="Área do consultor"
        description="Clientes, apurações, status e indicadores já entram nesta etapa com base preparada para upload e processamento nas próximas entregas."
      />
      {children}
    </AppShell>
  );
}
