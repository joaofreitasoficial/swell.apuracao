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
      <aside className="hidden w-48 shrink-0 border-r bg-card/90 px-3 py-4 lg:flex lg:flex-col">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
            Invictus
          </span>
          <h2 className="mt-1 text-sm font-semibold tracking-tight">
            {areaLabel}
          </h2>
        </div>

        <div className="mt-5">
          <SidebarNav items={navigationItems} />
        </div>

        <div className="mt-auto space-y-2 rounded-xl border bg-background/70 p-2.5">
          <div>
            <p className="truncate text-xs font-medium">{user.fullName}</p>
            <p className="truncate text-[10px] text-muted-foreground">
              {user.email}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <form action={logoutAction} className="flex-1">
              <Button type="submit" variant="outline" size="sm" className="w-full text-xs">
                Sair
              </Button>
            </form>
          </div>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b bg-card/70 px-4 py-2 shadow-sm lg:hidden">
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
        <div className="flex flex-1 flex-col gap-5 px-4 py-4 sm:px-5 lg:px-6">
          {children}
        </div>
      </main>
    </div>
  );
}
