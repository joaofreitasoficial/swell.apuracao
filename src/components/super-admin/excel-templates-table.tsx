import { ActivateTemplateButton } from "@/components/super-admin/activate-template-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/formatters";
import type { ExcelTemplateRecord } from "@/types/domain";

export function ExcelTemplatesTable({
  templates,
}: {
  templates: ExcelTemplateRecord[];
}) {
  return (
    <Card>
      <CardHeader className="space-y-2">
        <CardTitle className="text-2xl tracking-tight">
          Historico de templates
        </CardTitle>
        <p className="text-sm leading-6 text-muted-foreground">
          Cada versao fica registrada para permitir troca segura de modelo sem
          perder o historico do SaaS.
        </p>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Versao</TableHead>
              <TableHead>Arquivo</TableHead>
              <TableHead>Mapeamento</TableHead>
              <TableHead>Atualizado em</TableHead>
              <TableHead className="text-right">Acao</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.map((template) => (
              <TableRow key={template.id}>
                <TableCell className="align-top">
                  <div className="space-y-2">
                    <p className="font-medium">v{template.versionNumber}</p>
                    <Badge variant={template.isActive ? "default" : "outline"}>
                      {template.isActive ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="align-top">
                  <div className="space-y-1">
                    <p className="font-medium">{template.originalFileName}</p>
                    <p className="text-sm text-muted-foreground">
                      {template.mappingConfig.worksheetName}
                    </p>
                  </div>
                </TableCell>
                <TableCell className="align-top text-sm text-muted-foreground">
                  <div className="space-y-1">
                    <p>
                      Linha inicial: {template.mappingConfig.dataStartRow}
                    </p>
                    <p>
                      Mes/Ano/Total/Entradas: {template.mappingConfig.monthColumn}
                      /{template.mappingConfig.yearColumn}/
                      {template.mappingConfig.totalColumn}/
                      {template.mappingConfig.entriesColumn}
                    </p>
                  </div>
                </TableCell>
                <TableCell className="align-top text-sm text-muted-foreground">
                  {formatDateTime(template.updatedAt)}
                </TableCell>
                <TableCell className="align-top text-right">
                  <ActivateTemplateButton
                    templateId={template.id}
                    disabled={template.isActive}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
