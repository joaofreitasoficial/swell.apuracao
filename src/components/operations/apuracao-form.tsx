"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  createApuracaoAction,
  updateApuracaoAction,
} from "@/actions/apuracao-actions";
import { FormMessage } from "@/components/forms/form-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apuracaoStatuses, type ApuracaoStatus } from "@/types/domain";
import { initialFormState } from "@/types/forms";
import { getApuracaoStatusLabel } from "@/lib/formatters";

type ApuracaoFormProps = {
  mode: "create" | "edit";
  clientId: string;
  initialValues?: {
    id: string;
    fullName: string;
    status: ApuracaoStatus;
  };
};

export function ApuracaoForm({
  mode,
  clientId,
  initialValues,
}: ApuracaoFormProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    mode === "create" ? createApuracaoAction : updateApuracaoAction,
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
          Apuração
        </span>
        <CardTitle className="text-2xl tracking-tight">
          {mode === "create" ? "Nova apuração" : "Editar apuração"}
        </CardTitle>
        <p className="text-sm leading-6 text-muted-foreground">
          Defina o nome de referência e o status atual do fluxo operacional.
        </p>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="clientId" value={clientId} />
          {initialValues ? (
            <input type="hidden" name="apuracaoId" value={initialValues.id} />
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

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              name="status"
              className="flex h-8 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground shadow-xs outline-hidden focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              defaultValue={initialValues?.status ?? "draft"}
            >
              {apuracaoStatuses.map((status) => (
                <option
                  key={status}
                  value={status}
                  className="bg-background text-foreground"
                >
                  {getApuracaoStatusLabel(status)}
                </option>
              ))}
            </select>
            <FormMessage message={state.fieldErrors?.status?.[0]} />
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
                  ? "Criar apuração"
                  : "Salvar alterações"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
