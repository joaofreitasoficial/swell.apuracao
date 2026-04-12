"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  createClientAction,
  updateClientAction,
} from "@/actions/client-actions";
import { FormMessage } from "@/components/forms/form-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { initialFormState } from "@/types/forms";

type ClientFormProps = {
  mode: "create" | "edit";
  initialValues?: {
    id: string;
    fullName: string;
    whatsapp: string;
    cpf: string | null;
    notes: string | null;
  };
};

export function ClientForm({ mode, initialValues }: ClientFormProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    mode === "create" ? createClientAction : updateClientAction,
    initialFormState,
  );

  useEffect(() => {
    if (state.redirectTo) {
      router.push(state.redirectTo);
      router.refresh();
    }
  }, [router, state.redirectTo]);

  return (
    <Card>
      <CardHeader className="space-y-3">
        <span className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
          Cliente
        </span>
        <CardTitle className="text-2xl tracking-tight">
          {mode === "create" ? "Novo cliente" : "Editar cliente"}
        </CardTitle>
        <p className="text-sm leading-6 text-muted-foreground">
          Cadastre os dados operacionais do cliente para começar a organizar as
          apurações.
        </p>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {initialValues ? (
            <input type="hidden" name="clientId" value={initialValues.id} />
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="fullName">Nome completo</Label>
            <Input
              id="fullName"
              name="fullName"
              defaultValue={initialValues?.fullName}
              required
            />
            <FormMessage message={state.fieldErrors?.fullName?.[0]} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input
                id="whatsapp"
                name="whatsapp"
                defaultValue={initialValues?.whatsapp}
                required
              />
              <FormMessage message={state.fieldErrors?.whatsapp?.[0]} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cpf">CPF opcional</Label>
              <Input id="cpf" name="cpf" defaultValue={initialValues?.cpf ?? ""} />
              <FormMessage message={state.fieldErrors?.cpf?.[0]} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              name="notes"
              defaultValue={initialValues?.notes ?? ""}
              placeholder="Contexto do cliente, pendências, regras internas..."
            />
          </div>

          <FormMessage message={state.error} />
          <FormMessage message={state.success} variant="success" />

          <div className="flex justify-end">
            <Button type="submit" disabled={pending}>
              {pending
                ? mode === "create"
                  ? "Criando..."
                  : "Salvando..."
                : mode === "create"
                  ? "Criar cliente"
                  : "Salvar alterações"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
