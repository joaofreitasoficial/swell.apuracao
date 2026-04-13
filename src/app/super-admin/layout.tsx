import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { LayoutHeader } from "@/components/layout/layout-header";
import { requireRole } from "@/lib/auth/guards";
import { routes } from "@/lib/constants/routes";

const navigationItems = [
  {
    href: routes.superAdmin,
    label: "Visao geral",
  },
  {
    href: routes.superAdminUsers,
    label: "Usuarios",
  },
  {
    href: routes.superAdminTemplates,
    label: "Templates Excel",
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
        eyebrow="Administracao"
        title="Controle da plataforma"
        description="Gerencie acessos, templates e a base administrativa do SaaS com validacao server-side."
      />
      {children}
    </AppShell>
  );
}
