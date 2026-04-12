"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { deleteApuracaoAction } from "@/actions/apuracao-actions";
import { Button } from "@/components/ui/button";

type DeleteApuracaoButtonProps = {
  apuracaoId: string;
  clientId: string;
  apuracaoName: string;
};

export function DeleteApuracaoButton({
  apuracaoId,
  clientId,
  apuracaoName,
}: DeleteApuracaoButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="destructive"
      size="sm"
      disabled={isPending}
      onClick={() => {
        const confirmed = window.confirm(
          `Deseja realmente excluir a apuração ${apuracaoName}?`,
        );

        if (!confirmed) {
          return;
        }

        startTransition(async () => {
          const formData = new FormData();
          formData.set("apuracaoId", apuracaoId);
          formData.set("clientId", clientId);

          const result = await deleteApuracaoAction(formData);

          if (result.error) {
            toast.error(result.error);
            return;
          }

          toast.success(result.success ?? "Apuração excluída.");

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
