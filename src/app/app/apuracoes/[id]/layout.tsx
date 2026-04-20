import type { ReactNode } from "react";
import { notFound } from "next/navigation";

import { ApuracaoSubmenu } from "@/components/layout/apuracao-submenu";
import { getApuracaoById } from "@/lib/operations/queries";

type ApuracaoLayoutProps = {
  children: ReactNode;
  params: Promise<{ id: string }>;
};

export default async function ApuracaoLayout({
  children,
  params,
}: ApuracaoLayoutProps) {
  const { id } = await params;
  const apuracao = await getApuracaoById(id);

  if (!apuracao) {
    notFound();
  }

  return (
    <div className="-mx-4 flex flex-1 sm:-mx-6 lg:-mx-8">
      <ApuracaoSubmenu
        apuracaoId={apuracao.id}
        apuracaoName={apuracao.fullName}
        clientName={apuracao.clientFullName}
      />
      <div className="min-w-0 flex-1 px-4 sm:px-6 lg:px-8">{children}</div>
    </div>
  );
}
