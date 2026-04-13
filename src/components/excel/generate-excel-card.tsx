"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { generateExcelAction } from "@/actions/excel-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ExcelTemplateRecord } from "@/types/domain";

type GenerateExcelCardProps = {
  apuracaoId: string;
  template: ExcelTemplateRecord;
  generatedCount: number;
};

export function GenerateExcelCard({
  apuracaoId,
  template,
  generatedCount,
}: GenerateExcelCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Card className="h-fit">
      <CardHeader className="space-y-3">
        <span className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
          Excel final
        </span>
        <CardTitle className="text-2xl tracking-tight">
          Gerar arquivo da apuracao
        </CardTitle>
        <p className="text-sm leading-6 text-muted-foreground">
          O arquivo final usa o template ativo v{template.versionNumber} e
          preserva o layout do modelo configurado pelo super admin.
        </p>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="space-y-1 rounded-2xl border bg-muted/30 p-4">
          <p className="text-muted-foreground">Template ativo</p>
          <p className="font-medium">{template.originalFileName}</p>
          <p className="text-muted-foreground">
            Aba {template.mappingConfig.worksheetName} • linha inicial{" "}
            {template.mappingConfig.dataStartRow}
          </p>
        </div>

        <div className="space-y-1 rounded-2xl border bg-muted/30 p-4">
          <p className="text-muted-foreground">Historico desta apuracao</p>
          <p className="font-medium">{generatedCount} arquivo(s) gerado(s)</p>
          <p className="text-muted-foreground">
            Cada nova geracao fica salva com versao do template utilizada.
          </p>
        </div>

        <Button
          className="w-full"
          disabled={isPending}
          onClick={() => {
            startTransition(async () => {
              const formData = new FormData();
              formData.set("apuracaoId", apuracaoId);

              const result = await generateExcelAction(formData);

              if (result.error) {
                toast.error(result.error);
                return;
              }

              toast.success(result.success ?? "Excel gerado.");

              if (result.redirectTo) {
                router.replace(result.redirectTo);
              }

              router.refresh();
            });
          }}
        >
          {isPending ? "Gerando Excel..." : "Gerar Excel agora"}
        </Button>
      </CardContent>
    </Card>
  );
}
