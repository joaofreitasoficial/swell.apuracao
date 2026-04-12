import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/formatters";
import type { TransactionRecord } from "@/types/domain";

function formatMoney(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function TransactionsPreviewTable({
  transactions,
}: {
  transactions: TransactionRecord[];
}) {
  return (
    <div className="rounded-3xl border bg-card p-6">
      <div className="space-y-1">
        <h3 className="text-xl font-semibold tracking-tight">
          Prévia das transações estruturadas
        </h3>
        <p className="text-sm leading-6 text-muted-foreground">
          Amostra das movimentações salvas a partir do pipeline desta etapa.
        </p>
      </div>

      <div className="mt-5 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Mês/Ano</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Direção</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Confiança</TableHead>
              <TableHead>Duplicada</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.length > 0 ? (
              transactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>{formatDate(transaction.transactionDate)}</TableCell>
                  <TableCell>
                    {String(transaction.monthRef).padStart(2, "0")}/{transaction.yearRef}
                  </TableCell>
                  <TableCell className="max-w-[360px] truncate">
                    {transaction.description}
                  </TableCell>
                  <TableCell>
                    <Badge variant={transaction.direction === "credit" ? "default" : "outline"}>
                      {transaction.direction === "credit" ? "Crédito" : "Débito"}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatMoney(transaction.amount)}</TableCell>
                  <TableCell>{Math.round(transaction.extractionConfidence * 100)}%</TableCell>
                  <TableCell>
                    <Badge variant={transaction.isDuplicate ? "destructive" : "secondary"}>
                      {transaction.isDuplicate ? "Sim" : "Não"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  Nenhuma transação estruturada ainda para esta apuração.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
