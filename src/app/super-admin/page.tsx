import { ShieldCheck, UserCog, Users, UserX } from "lucide-react";

import { OverviewCard } from "@/components/super-admin/overview-card";
import { getAdminOverviewStats } from "@/lib/auth/queries";

export default async function SuperAdminPage() {
  const stats = await getAdminOverviewStats();

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <OverviewCard
        title="Usuários"
        value={stats.totalUsers}
        description="Total de contas provisionadas na plataforma."
        icon={Users}
      />
      <OverviewCard
        title="Ativos"
        value={stats.activeUsers}
        description="Usuários com acesso habilitado ao sistema."
        icon={ShieldCheck}
      />
      <OverviewCard
        title="Super Admins"
        value={stats.superAdmins}
        description="Usuários que podem administrar a plataforma."
        icon={UserCog}
      />
      <OverviewCard
        title="Inativos"
        value={stats.inactiveUsers}
        description="Contas pausadas e fora da operação."
        icon={UserX}
      />
    </section>
  );
}
