"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { deleteClientAction } from "@/actions/client-actions";
import { Button } from "@/components/ui/button";

type DeleteClientButtonProps = {
  clientId: string;
  clientName: string;
};

export function DeleteClientButton({
  clientId,
  clientName,
}: DeleteClientButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="destructive"
      size="sm"
      disabled={isPending}
      onClick={() => {
        const confirmed = window.confirm(
          `Deseja realmente excluir o cliente ${clientName}?`,
        );

        if (!confirmed) {
          return;
        }

        startTransition(async () => {
          const formData = new FormData();
          formData.set("clientId", clientId);

          const result = await deleteClientAction(formData);

          if (result.error) {
            toast.error(result.error);
            return;
          }

          toast.success(result.success ?? "Cliente excluído.");

          if (result.redirectTo) {
            router.push(result.redirectTo);
          } else {
            router.refresh();
          }
        });
      }}
    >
      Excluir
    </Button>
  );
}
