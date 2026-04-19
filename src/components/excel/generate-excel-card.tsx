"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { generateExcelAction } from "@/actions/excel-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type GenerateExcelCardProps = {
  apuracaoId: string;
  generatedCount: number;
};

export function GenerateExcelCard({
  apuracaoId,
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
          O arquivo usa o modelo oficial APURAÇÃO VAZIA. Cada mês revisado
          aparece em uma coluna, com os valores das entradas mantidas.
        </p>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="space-y-1 rounded-2xl border bg-muted/30 p-4">
          <p className="text-muted-foreground">Modelo de saida</p>
          <p className="font-medium">APURAÇÃO VAZIA.xlsx</p>
          <p className="text-muted-foreground">
            Layout fixo com uma coluna por mês detectado.
          </p>
        </div>

        <div className="space-y-1 rounded-2xl border bg-muted/30 p-4">
          <p className="text-muted-foreground">Historico desta apuracao</p>
          <p className="font-medium">{generatedCount} arquivo(s) gerado(s)</p>
          <p className="text-muted-foreground">
            Cada nova geracao fica salva com data e download disponivel.
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
