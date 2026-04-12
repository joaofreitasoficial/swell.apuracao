"use client";

import { useActionState } from "react";

import { updatePasswordAction } from "@/actions/auth-actions";
import { FormMessage } from "@/components/forms/form-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { initialFormState } from "@/types/forms";

export function UpdatePasswordForm({ description }: { description: string }) {
  const [state, formAction, pending] = useActionState(
    updatePasswordAction,
    initialFormState,
  );

  return (
    <Card className="w-full max-w-lg rounded-3xl">
      <CardHeader className="space-y-3">
        <span className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
          Reset de senha
        </span>
        <CardTitle className="text-3xl tracking-tight">Defina uma nova senha</CardTitle>
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="password">Nova senha</Label>
            <Input id="password" name="password" type="password" required />
            <FormMessage message={state.fieldErrors?.password?.[0]} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar senha</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
            />
            <FormMessage message={state.fieldErrors?.confirmPassword?.[0]} />
          </div>

          <FormMessage message={state.error} />
          <FormMessage message={state.success} variant="success" />

          <Button type="submit" className="w-full" size="lg" disabled={pending}>
            {pending ? "Salvando..." : "Atualizar senha"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
