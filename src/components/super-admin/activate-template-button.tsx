"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { activateExcelTemplateAction } from "@/actions/excel-actions";
import { Button } from "@/components/ui/button";

type ActivateTemplateButtonProps = {
  templateId: string;
  disabled?: boolean;
};

export function ActivateTemplateButton({
  templateId,
  disabled = false,
}: ActivateTemplateButtonProps) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={disabled || isPending}
      onClick={() => {
        startTransition(async () => {
          const formData = new FormData();
          formData.set("templateId", templateId);

          const result = await activateExcelTemplateAction(formData);

          if (result.error) {
            toast.error(result.error);
            return;
          }

          toast.success(result.success ?? "Template ativado.");
        });
      }}
    >
      {isPending ? "Ativando..." : "Ativar"}
    </Button>
  );
}
