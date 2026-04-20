"use client";

import {
  FileSpreadsheet,
  FileText,
  ListChecks,
  PieChart,
  UploadCloud,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";

import { appRouteBuilders } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";

type SubmenuItem = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
};

type ApuracaoSubmenuProps = {
  apuracaoId: string;
  apuracaoName: string;
  clientName: string | undefined;
};

export function ApuracaoSubmenu({
  apuracaoId,
  apuracaoName,
  clientName,
}: ApuracaoSubmenuProps) {
  const pathname = usePathname();

  const items: SubmenuItem[] = [
    {
      href: appRouteBuilders.apuracao(apuracaoId),
      label: "Visao geral",
      description: "Resumo e atalhos",
      icon: PieChart,
    },
    {
      href: appRouteBuilders.apuracaoUpload(apuracaoId),
      label: "Upload",
      description: "Enviar PDFs",
      icon: UploadCloud,
    },
    {
      href: appRouteBuilders.apuracaoArquivos(apuracaoId),
      label: "Arquivos",
      description: "Extratos processados",
      icon: FileText,
    },
    {
      href: appRouteBuilders.apuracaoReview(apuracaoId),
      label: "Revisao",
      description: "Decidir entradas",
      icon: ListChecks,
    },
    {
      href: appRouteBuilders.apuracaoExcel(apuracaoId),
      label: "Gerar Excel",
      description: "Exportar APURACAO VAZIA",
      icon: FileSpreadsheet,
    },
  ];

  return (
    <aside className="hidden w-64 shrink-0 border-r bg-card/60 p-4 lg:block">
      <div className="mb-4 space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Apuracao
        </p>
        <h2 className="line-clamp-2 text-base font-semibold leading-snug">
          {apuracaoName}
        </h2>
        {clientName ? (
          <p className="line-clamp-1 text-xs text-muted-foreground">
            {clientName}
          </p>
        ) : null}
      </div>

      <nav className="space-y-0.5">
        {items.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== appRouteBuilders.apuracao(apuracaoId) &&
              pathname.startsWith(item.href));

          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-start gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-primary/10 text-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
              )}
            >
              <Icon
                className={cn(
                  "mt-0.5 size-4 shrink-0",
                  isActive ? "text-primary" : "text-muted-foreground",
                )}
              />
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "font-medium leading-tight",
                    isActive ? "text-foreground" : "",
                  )}
                >
                  {item.label}
                </p>
                <p className="text-xs text-muted-foreground">
                  {item.description}
                </p>
              </div>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
