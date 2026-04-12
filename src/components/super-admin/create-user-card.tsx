"use client";

import { useActionState } from "react";

import { createUserAction } from "@/actions/super-admin-user-actions";
import { FormMessage } from "@/components/forms/form-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { initialFormState } from "@/types/forms";

export function CreateUserCard() {
  const [state, formAction, pending] = useActionState(
    createUserAction,
    initialFormState,
  );

  return (
    <Card className="h-fit">
      <CardHeader className="space-y-3">
        <span className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
          Super Admin
        </span>
        <CardTitle className="text-2xl tracking-tight">Criar usuário</CardTitle>
        <p className="text-sm leading-6 text-muted-foreground">
          Crie contas com perfil de operação ou administrativo e envie o reset
          de senha depois, se necessário.
        </p>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Nome completo</Label>
            <Input id="fullName" name="fullName" required />
            <FormMessage message={state.fieldErrors?.fullName?.[0]} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" required />
            <FormMessage message={state.fieldErrors?.email?.[0]} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha provisória</Label>
            <Input id="password" name="password" type="password" required />
            <FormMessage message={state.fieldErrors?.password?.[0]} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Perfil</Label>
            <select
              id="role"
              name="role"
              className="flex h-8 w-full rounded-lg border border-input bg-transparent px-3 text-sm shadow-xs outline-hidden focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              defaultValue="user"
            >
              <option value="user">Usuário</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>

          <FormMessage message={state.error} />
          <FormMessage message={state.success} variant="success" />

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Criando..." : "Criar usuário"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
