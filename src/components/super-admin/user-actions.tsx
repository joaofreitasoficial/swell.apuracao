"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import {
  deleteUserAction,
  resetUserPasswordAction,
  toggleUserActiveAction,
} from "@/actions/super-admin-user-actions";
import { Button } from "@/components/ui/button";
import type { ManagedUser } from "@/types/auth";

export function UserActions({ user }: { user: ManagedUser }) {
  const [isPending, startTransition] = useTransition();

  const runFormAction = async (
    action: (formData: FormData) => Promise<{ error?: string; success?: string }>,
    formData: FormData,
  ) => {
    startTransition(async () => {
      const result = await action(formData);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      if (result.success) {
        toast.success(result.success);
      }
    });
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={isPending}
        onClick={() => {
          const formData = new FormData();
          formData.set("userId", user.id);
          formData.set("nextActive", user.isActive ? "false" : "true");
          void runFormAction(toggleUserActiveAction, formData);
        }}
      >
        {user.isActive ? "Desativar" : "Ativar"}
      </Button>

      <Button
        variant="outline"
        size="sm"
        disabled={isPending}
        onClick={() => {
          const formData = new FormData();
          formData.set("userId", user.id);
          formData.set("email", user.email);
          void runFormAction(resetUserPasswordAction, formData);
        }}
      >
        Reset senha
      </Button>

      <Button
        variant="destructive"
        size="sm"
        disabled={isPending}
        onClick={() => {
          const confirmed = window.confirm(
            `Deseja realmente excluir ${user.fullName}?`,
          );

          if (!confirmed) {
            return;
          }

          const formData = new FormData();
          formData.set("userId", user.id);
          void runFormAction(deleteUserAction, formData);
        }}
      >
        Excluir
      </Button>
    </div>
  );
}
