"use client";

import Link from "next/link";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";

import { DeleteClientButton } from "@/components/operations/delete-client-button";
import { TableShell } from "@/components/shared/table-shell";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { appRouteBuilders } from "@/lib/constants/routes";
import { formatDate, formatDateTime } from "@/lib/formatters";
import type { ClientRecord } from "@/types/domain";

const columns: ColumnDef<ClientRecord>[] = [
  {
    accessorKey: "fullName",
    header: "Cliente",
    cell: ({ row }) => (
      <div className="space-y-1">
        <Link
          href={appRouteBuilders.client(row.original.id)}
          className="font-medium hover:text-primary"
        >
          {row.original.fullName}
        </Link>
        <p className="text-sm text-muted-foreground">{row.original.whatsapp}</p>
      </div>
    ),
  },
  {
    accessorKey: "cpf",
    header: "CPF",
    cell: ({ row }) => row.original.cpf || "Não informado",
  },
  {
    accessorKey: "apuracoesCount",
    header: "Apurações",
    cell: ({ row }) => row.original.apuracoesCount ?? 0,
  },
  {
    accessorKey: "latestApuracaoAt",
    header: "Última apuração",
    cell: ({ row }) =>
      row.original.latestApuracaoAt
        ? formatDate(row.original.latestApuracaoAt)
        : "Sem apuração",
  },
  {
    accessorKey: "createdAt",
    header: "Criado em",
    cell: ({ row }) => formatDateTime(row.original.createdAt),
  },
  {
    id: "actions",
    header: "Ações",
    cell: ({ row }) => (
      <div className="flex justify-end">
        <DeleteClientButton
          clientId={row.original.id}
          clientName={row.original.fullName}
        />
      </div>
    ),
  },
];

export function ClientsTable({ data }: { data: ClientRecord[] }) {
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <TableShell
      title="Clientes"
      description="Tabela operacional com busca, paginação e navegação para apurações."
    >
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  Nenhum cliente encontrado com os filtros atuais.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </TableShell>
  );
}
