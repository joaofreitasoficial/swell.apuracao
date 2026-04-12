import Link from "next/link";

import { Button } from "@/components/ui/button";
import { routes } from "@/lib/constants/routes";

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-lg rounded-3xl border bg-card p-8 text-center shadow-sm">
        <span className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
          Acesso bloqueado
        </span>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">
          Seu usuário não tem permissão para acessar esta área.
        </h1>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          Se a conta estiver desativada ou sem o papel correto, peça ao super
          admin para revisar o cadastro.
        </p>
        <div className="mt-6 flex justify-center">
          <Button render={<Link href={routes.login} />}>Voltar ao login</Button>
        </div>
      </div>
    </div>
  );
}
