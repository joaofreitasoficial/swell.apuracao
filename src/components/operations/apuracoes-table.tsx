"use client";

import Link from "next/link";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";

import { DeleteApuracaoButton } from "@/components/operations/delete-apuracao-button";
import { StatusBadge } from "@/components/operations/status-badge";
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
import { formatDateTime } from "@/lib/formatters";
import type { ApuracaoRecord } from "@/types/domain";

type ApuracoesTableProps = {
  data: ApuracaoRecord[];
  showClientColumn?: boolean;
};

export function ApuracoesTable({
  data,
  showClientColumn = false,
}: ApuracoesTableProps) {
  const columns: ColumnDef<ApuracaoRecord>[] = [
    {
      accessorKey: "fullName",
      header: "Apuração",
      cell: ({ row }) => (
        <div className="space-y-1">
          <Link
            href={appRouteBuilders.apuracao(row.original.id)}
            className="font-medium hover:text-primary"
          >
            {row.original.fullName}
          </Link>
          {showClientColumn && row.original.clientFullName ? (
            <p className="text-sm text-muted-foreground">
              {row.original.clientFullName}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "createdAt",
      header: "Criada em",
      cell: ({ row }) => formatDateTime(row.original.createdAt),
    },
    {
      accessorKey: "updatedAt",
      header: "Atualizada em",
      cell: ({ row }) => formatDateTime(row.original.updatedAt),
    },
    {
      id: "actions",
      header: "Ações",
      cell: ({ row }) => (
        <div className="flex justify-end">
          <DeleteApuracaoButton
            apuracaoId={row.original.id}
            apuracaoName={row.original.fullName}
            clientId={row.original.clientId}
          />
        </div>
      ),
    },
  ];

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <TableShell
      title="Apurações"
      description="Acompanhamento por cliente com status operacional e atualização rápida."
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
                  Nenhuma apuração encontrada com os filtros atuais.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </TableShell>
  );
}
