import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { LayoutHeader } from "@/components/layout/layout-header";
import { requireRole } from "@/lib/auth/guards";
import { routes } from "@/lib/constants/routes";

const navigationItems = [
  {
    href: routes.superAdmin,
    label: "Visão geral",
  },
  {
    href: routes.superAdminUsers,
    label: "Usuários",
  },
];

export default async function SuperAdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireRole("super_admin");

  return (
    <AppShell areaLabel="Super Admin" navigationItems={navigationItems} user={user}>
      <LayoutHeader
        eyebrow="Administração"
        title="Controle da plataforma"
        description="Gerencie acessos, segurança e a base inicial do SaaS sem abrir mão da validação server-side."
      />
      {children}
    </AppShell>
  );
}
