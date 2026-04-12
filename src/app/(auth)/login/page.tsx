import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { getOptionalUserContext } from "@/lib/auth/guards";
import { getDefaultPathForRole } from "@/lib/auth/roles";

export default async function LoginPage() {
  const context = await getOptionalUserContext();

  if (context) {
    redirect(getDefaultPathForRole(context.role));
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(20,184,166,0.18),_transparent_35%),linear-gradient(135deg,rgba(250,250,249,1)_0%,rgba(245,245,244,1)_55%,rgba(236,253,245,0.9)_100%)] px-4 py-12 dark:bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),_transparent_30%),linear-gradient(135deg,rgba(24,24,27,1)_0%,rgba(15,23,42,1)_100%)]">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,transparent_0%,rgba(15,23,42,0.03)_50%,transparent_100%)] dark:bg-[linear-gradient(to_right,transparent_0%,rgba(255,255,255,0.03)_50%,transparent_100%)]" />
      <div className="relative grid w-full max-w-5xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="hidden rounded-3xl border border-border/60 bg-card/80 p-10 shadow-lg backdrop-blur lg:flex lg:flex-col lg:justify-between">
          <div className="space-y-5">
            <span className="inline-flex w-fit rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              APURAÇÃO IMOBILIÁRIA
            </span>
            <div className="space-y-4">
              <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-balance">
                Apuração bancária com revisão segura, fluxo SaaS e base pronta
                para escalar.
              </h1>
              <p className="max-w-xl text-base leading-7 text-muted-foreground">
                Etapa 1 da plataforma: autenticação segura, papéis separados,
                painel de super admin e fundação preparada para upload, IA e
                exportação de Excel nas próximas entregas.
              </p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              "Cookies httpOnly com Supabase SSR",
              "Validação de role no servidor",
              "Painel super admin com gestão de usuários",
            ].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-border/70 bg-background/70 p-4 text-sm text-muted-foreground shadow-sm"
              >
                {item}
              </div>
            ))}
          </div>
        </section>

        <LoginForm />
      </div>
    </div>
  );
}
