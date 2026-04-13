"use client";

import { useActionState } from "react";

import { uploadExcelTemplateAction } from "@/actions/excel-actions";
import { FormMessage } from "@/components/forms/form-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { initialFormState } from "@/types/forms";

const defaultMapping = {
  worksheetName: "APURACAO",
  dataStartRow: "7",
  monthColumn: "A",
  yearColumn: "B",
  totalColumn: "C",
  entriesColumn: "D",
};

export function ExcelTemplateUploadCard() {
  const [state, formAction, pending] = useActionState(
    uploadExcelTemplateAction,
    initialFormState,
  );

  return (
    <Card className="h-fit">
      <CardHeader className="space-y-3">
        <span className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
          Templates
        </span>
        <CardTitle className="text-2xl tracking-tight">
          Enviar novo modelo Excel
        </CardTitle>
        <p className="text-sm leading-6 text-muted-foreground">
          Envie o arquivo base da apuracao e informe onde cada dado deve ser
          escrito. Cada upload cria uma nova versao.
        </p>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-5" encType="multipart/form-data">
          <div className="space-y-2">
            <Label htmlFor="templateFile">Arquivo .xlsx</Label>
            <Input
              id="templateFile"
              name="templateFile"
              type="file"
              accept=".xlsx"
              required
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="worksheetName">Nome da aba</Label>
              <Input
                id="worksheetName"
                name="worksheetName"
                defaultValue={defaultMapping.worksheetName}
                required
              />
              <FormMessage message={state.fieldErrors?.worksheetName?.[0]} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dataStartRow">Linha inicial dos meses</Label>
              <Input
                id="dataStartRow"
                name="dataStartRow"
                type="number"
                min={1}
                defaultValue={defaultMapping.dataStartRow}
                required
              />
              <FormMessage message={state.fieldErrors?.dataStartRow?.[0]} />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="monthColumn">Coluna mes</Label>
              <Input
                id="monthColumn"
                name="monthColumn"
                defaultValue={defaultMapping.monthColumn}
                required
              />
              <FormMessage message={state.fieldErrors?.monthColumn?.[0]} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="yearColumn">Coluna ano</Label>
              <Input
                id="yearColumn"
                name="yearColumn"
                defaultValue={defaultMapping.yearColumn}
                required
              />
              <FormMessage message={state.fieldErrors?.yearColumn?.[0]} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="totalColumn">Coluna total</Label>
              <Input
                id="totalColumn"
                name="totalColumn"
                defaultValue={defaultMapping.totalColumn}
                required
              />
              <FormMessage message={state.fieldErrors?.totalColumn?.[0]} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="entriesColumn">Coluna entradas</Label>
              <Input
                id="entriesColumn"
                name="entriesColumn"
                defaultValue={defaultMapping.entriesColumn}
                required
              />
              <FormMessage message={state.fieldErrors?.entriesColumn?.[0]} />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="clientNameCell">Celula nome do cliente</Label>
              <Input id="clientNameCell" name="clientNameCell" placeholder="B2" />
              <FormMessage message={state.fieldErrors?.clientNameCell?.[0]} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="apuracaoNameCell">Celula nome da apuracao</Label>
              <Input
                id="apuracaoNameCell"
                name="apuracaoNameCell"
                placeholder="B3"
              />
              <FormMessage message={state.fieldErrors?.apuracaoNameCell?.[0]} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="generatedAtCell">Celula data geracao</Label>
              <Input id="generatedAtCell" name="generatedAtCell" placeholder="F2" />
              <FormMessage message={state.fieldErrors?.generatedAtCell?.[0]} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="totalAnnualCell">Celula total anual</Label>
              <Input id="totalAnnualCell" name="totalAnnualCell" placeholder="F3" />
              <FormMessage message={state.fieldErrors?.totalAnnualCell?.[0]} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="averageMonthlyCell">Celula media mensal</Label>
              <Input
                id="averageMonthlyCell"
                name="averageMonthlyCell"
                placeholder="F4"
              />
              <FormMessage message={state.fieldErrors?.averageMonthlyCell?.[0]} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="highestMonthCell">Celula maior mes</Label>
              <Input id="highestMonthCell" name="highestMonthCell" placeholder="F5" />
              <FormMessage message={state.fieldErrors?.highestMonthCell?.[0]} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lowestMonthCell">Celula menor mes</Label>
              <Input id="lowestMonthCell" name="lowestMonthCell" placeholder="F6" />
              <FormMessage message={state.fieldErrors?.lowestMonthCell?.[0]} />
            </div>
          </div>

          <label className="flex items-center gap-3 rounded-2xl border bg-muted/30 px-4 py-3 text-sm">
            <input
              type="checkbox"
              name="activateNow"
              defaultChecked
              className="size-4 rounded border-input"
            />
            Ativar este template assim que o upload terminar
          </label>

          <FormMessage message={state.error} />
          <FormMessage message={state.success} variant="success" />

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Enviando template..." : "Salvar template"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
