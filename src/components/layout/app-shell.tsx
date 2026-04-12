import type { ReactNode } from "react";

import { logoutAction } from "@/actions/auth-actions";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import type { UserContext } from "@/types/auth";

type NavigationItem = {
  href: string;
  label: string;
};

type AppShellProps = {
  areaLabel: string;
  navigationItems: NavigationItem[];
  user: UserContext;
  children: ReactNode;
};

export function AppShell({
  areaLabel,
  navigationItems,
  user,
  children,
}: AppShellProps) {
  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="hidden w-72 border-r bg-card/90 p-6 lg:flex lg:flex-col">
        <div>
          <span className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
            APURAÇÃO IMOBILIÁRIA
          </span>
          <h2 className="mt-3 text-xl font-semibold tracking-tight">{areaLabel}</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Base SaaS com autenticação, roles e interface pronta para evolução
            nas próximas etapas.
          </p>
        </div>

        <div className="mt-8">
          <SidebarNav items={navigationItems} />
        </div>

        <div className="mt-auto space-y-4 rounded-2xl border bg-background/70 p-4">
          <div>
            <p className="text-sm font-medium">{user.fullName}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <form action={logoutAction} className="flex-1">
              <Button type="submit" variant="outline" className="w-full">
                Sair
              </Button>
            </form>
          </div>
        </div>
      </aside>

      <main className="flex-1">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between rounded-2xl border bg-card/70 px-4 py-3 shadow-sm lg:hidden">
            <div>
              <p className="text-sm font-medium">{user.fullName}</p>
              <p className="text-xs text-muted-foreground">{areaLabel}</p>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <form action={logoutAction}>
                <Button type="submit" variant="outline" size="sm">
                  Sair
                </Button>
              </form>
            </div>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
