import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import type { GeneratedExcelRecord } from "@/types/domain";

export function GeneratedExcelsTable({
  generatedExcels,
}: {
  generatedExcels: GeneratedExcelRecord[];
}) {
  return (
    <Card>
      <CardHeader className="space-y-2">
        <CardTitle className="text-2xl tracking-tight">
          Historico de arquivos gerados
        </CardTitle>
        <p className="text-sm leading-6 text-muted-foreground">
          Cada exportacao fica registrada com a versao do template usada na
          geracao final.
        </p>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Arquivo</TableHead>
              <TableHead>Template</TableHead>
              <TableHead>Gerado em</TableHead>
              <TableHead className="text-right">Download</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {generatedExcels.map((generatedExcel) => (
              <TableRow key={generatedExcel.id}>
                <TableCell className="align-top">
                  <p className="font-medium">{generatedExcel.fileName}</p>
                </TableCell>
                <TableCell className="align-top">
                  <Badge variant="secondary">
                    v{generatedExcel.templateVersion ?? "?"}
                  </Badge>
                </TableCell>
                <TableCell className="align-top text-sm text-muted-foreground">
                  {formatDateTime(generatedExcel.createdAt)}
                </TableCell>
                <TableCell className="align-top text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    render={
                      <a
                        href={`/api/generated-excels/${generatedExcel.id}/download`}
                        download={generatedExcel.fileName}
                      />
                    }
                  >
                    Baixar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
