"use client";

import { useActionState } from "react";

import { loginAction } from "@/actions/auth-actions";
import { FormMessage } from "@/components/forms/form-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { initialFormState } from "@/types/forms";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(
    loginAction,
    initialFormState,
  );

  return (
    <Card className="rounded-3xl border-border/70 bg-card/95 shadow-xl backdrop-blur">
      <CardHeader className="space-y-3">
        <span className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
          Entrar
        </span>
        <CardTitle className="text-3xl tracking-tight">
          Acesse a plataforma
        </CardTitle>
        <p className="text-sm leading-6 text-muted-foreground">
          O login acontece sempre em <code>/login</code>. Depois disso, o
          redirecionamento usa o papel salvo no banco.
        </p>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="voce@empresa.com"
              required
            />
            <FormMessage message={state.fieldErrors?.email?.[0]} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="Digite sua senha"
              required
            />
            <FormMessage message={state.fieldErrors?.password?.[0]} />
          </div>

          <FormMessage message={state.error} />

          <Button type="submit" className="w-full" size="lg" disabled={pending}>
            {pending ? "Entrando..." : "Entrar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
