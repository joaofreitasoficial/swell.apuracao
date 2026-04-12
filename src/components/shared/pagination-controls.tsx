import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { PaginationMeta } from "@/types/domain";

type PaginationControlsProps = {
  pagination: PaginationMeta;
  buildHref: (page: number) => string;
};

export function PaginationControls({
  pagination,
  buildHref,
}: PaginationControlsProps) {
  if (pagination.totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border bg-card px-4 py-3">
      <p className="text-sm text-muted-foreground">
        Página {pagination.page} de {pagination.totalPages} • {pagination.totalItems}{" "}
        registros
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={pagination.page <= 1}
          render={
            pagination.page > 1 ? (
              <Link href={buildHref(pagination.page - 1)} />
            ) : undefined
          }
        >
          Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={pagination.page >= pagination.totalPages}
          render={
            pagination.page < pagination.totalPages ? (
              <Link href={buildHref(pagination.page + 1)} />
            ) : undefined
          }
        >
          Próxima
        </Button>
      </div>
    </div>
  );
}
