"use client";

import { useActionState, useState } from "react";

import { updateUserAction } from "@/actions/super-admin-user-actions";
import { FormMessage } from "@/components/forms/form-message";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { initialFormState } from "@/types/forms";
import type { ManagedUser } from "@/types/auth";

export function EditUserDialog({ user }: { user: ManagedUser }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    updateUserAction,
    initialFormState,
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        Editar
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar usuário</DialogTitle>
          <DialogDescription>
            Atualize os dados cadastrais, o papel e o e-mail usado no login.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="userId" value={user.id} />

          <div className="space-y-2">
            <Label htmlFor={`fullName-${user.id}`}>Nome completo</Label>
            <Input
              id={`fullName-${user.id}`}
              name="fullName"
              defaultValue={user.fullName}
              required
            />
            <FormMessage message={state.fieldErrors?.fullName?.[0]} />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`email-${user.id}`}>E-mail</Label>
            <Input
              id={`email-${user.id}`}
              name="email"
              type="email"
              defaultValue={user.email}
              required
            />
            <FormMessage message={state.fieldErrors?.email?.[0]} />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`role-${user.id}`}>Perfil</Label>
            <select
              id={`role-${user.id}`}
              name="role"
              defaultValue={user.role}
              className="flex h-8 w-full rounded-lg border border-input bg-transparent px-3 text-sm shadow-xs outline-hidden focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="user">Usuário</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>

          <FormMessage message={state.error} />
          <FormMessage message={state.success} variant="success" />

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando..." : "Salvar alterações"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
