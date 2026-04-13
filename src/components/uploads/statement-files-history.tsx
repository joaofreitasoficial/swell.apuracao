"use client";

import { useRef, useState, useTransition } from "react";
import {
  FileWarning,
  History,
  LoaderCircle,
  RefreshCcw,
  ScrollText,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { ProcessingLogsList } from "@/components/uploads/processing-logs-list";
import { ReprocessingJobsList } from "@/components/uploads/reprocessing-jobs-list";
import { StatementFileStatusBadge } from "@/components/uploads/statement-file-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  FileProcessingLogRecord,
  ReprocessingJobRecord,
  StatementFileRecord,
} from "@/types/domain";

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function parseJsonResponse(payload: string) {
  try {
    return JSON.parse(payload || "{}") as { error?: string };
  } catch {
    return { error: "O servidor retornou uma resposta invalida." };
  }
}

export function StatementFilesHistory({
  apuracaoId,
  files,
  jobs,
  logs,
}: {
  apuracaoId: string;
  files: StatementFileRecord[];
  jobs: ReprocessingJobRecord[];
  logs: FileProcessingLogRecord[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const reuploadInputRef = useRef<HTMLInputElement | null>(null);
  const [reuploadTargetId, setReuploadTargetId] = useState<string | null>(null);

  const deleteFile = (statementFileId: string, fileName: string) => {
    startTransition(async () => {
      const confirmed = window.confirm(
        `Deseja realmente excluir o arquivo ${fileName}?`,
      );

      if (!confirmed) {
        return;
      }

      const response = await fetch(`/api/statement-files/${statementFileId}`, {
        method: "DELETE",
      });
      const payload = parseJsonResponse(await response.text());

      if (!response.ok || payload.error) {
        toast.error(payload.error ?? "Falha ao excluir arquivo.");
        return;
      }

      toast.success("Arquivo excluido com sucesso.");
      router.refresh();
    });
  };

  const retryFile = (statementFileId: string) => {
    startTransition(async () => {
      const response = await fetch(`/api/statement-files/${statementFileId}/retry`, {
        method: "POST",
      });
      const payload = parseJsonResponse(await response.text());

      if (!response.ok || payload.error) {
        toast.error(payload.error ?? "Falha ao reprocessar arquivo.");
        return;
      }

      toast.success("Reprocessamento iniciado.");
      router.refresh();
    });
  };

  const reuploadFile = (statementFileId: string, file: File) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("statementFileId", statementFileId);

      const response = await fetch(`/api/apuracoes/${apuracaoId}/statement-files`, {
        method: "POST",
        body: formData,
      });
      const payload = parseJsonResponse(await response.text());

      if (!response.ok || payload.error) {
        toast.error(payload.error ?? "Falha ao reenviar arquivo.");
        return;
      }

      toast.success("Arquivo reenviado com sucesso.");
      router.refresh();
    });
  };

  const failedFiles = files.filter((file) => file.processingStatus === "failed").length;
  const processedFiles = files.filter((file) => file.processingStatus === "processed").length;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl tracking-tight">
              Arquivos e processamento
            </CardTitle>
            <p className="text-sm leading-6 text-muted-foreground">
              Esta tela concentra o historico dos extratos enviados, retries,
              reuploads e logs tecnicos do pipeline. O upload em lote fica
              separado para manter a operacao mais limpa.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {files.length > 0 ? (
              files.map((file) => (
                <div
                  key={file.id}
                  className="rounded-2xl border border-border/70 bg-background/70 p-4"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{file.originalFileName}</p>
                        <StatementFileStatusBadge status={file.processingStatus} />
                      </div>
                      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                        <span>{formatBytes(file.fileSize)}</span>
                        <span>
                          {file.pageCount ? `${file.pageCount} paginas` : "Paginas pendentes"}
                        </span>
                        <span>{file.detectedBankName ?? "Banco pendente"}</span>
                        <span>{file.detectedAccountLabel ?? "Conta pendente"}</span>
                      </div>
                      {file.processingError ? (
                        <p className="text-sm text-destructive">{file.processingError}</p>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isPending}
                        onClick={() => retryFile(file.id)}
                      >
                        {isPending ? (
                          <LoaderCircle className="animate-spin" />
                        ) : (
                          <RefreshCcw />
                        )}
                        Retry
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isPending}
                        onClick={() => {
                          setReuploadTargetId(file.id);
                          reuploadInputRef.current?.click();
                        }}
                      >
                        <UploadCloud />
                        Reenviar
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={isPending}
                        onClick={() => deleteFile(file.id, file.originalFileName)}
                      >
                        <Trash2 />
                        Excluir
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhum PDF enviado ainda para esta apuracao.
              </p>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle className="text-xl tracking-tight">
                Painel tecnico
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-start gap-3 rounded-2xl border bg-background/70 p-4">
                <UploadCloud className="mt-0.5 size-4 text-primary" />
                <div>
                  <p className="font-medium">{files.length} arquivos registrados</p>
                  <p className="text-muted-foreground">
                    Base historica desta apuracao.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-2xl border bg-background/70 p-4">
                <FileWarning className="mt-0.5 size-4 text-destructive" />
                <div>
                  <p className="font-medium">{failedFiles} com falha</p>
                  <p className="text-muted-foreground">
                    Arquivos que ainda precisam de retry ou reenvio.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-2xl border bg-background/70 p-4">
                <History className="mt-0.5 size-4 text-primary" />
                <div>
                  <p className="font-medium">{jobs.length} jobs de processamento</p>
                  <p className="text-muted-foreground">
                    Historico incremental do pipeline.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-2xl border bg-background/70 p-4">
                <ScrollText className="mt-0.5 size-4 text-primary" />
                <div>
                  <p className="font-medium">{processedFiles} processados</p>
                  <p className="text-muted-foreground">
                    Extratos que ja voltaram com leitura salva.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <ReprocessingJobsList jobs={jobs} />
      <ProcessingLogsList logs={logs} />

      <input
        ref={reuploadInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];

          if (reuploadTargetId && file) {
            reuploadFile(reuploadTargetId, file);
          }

          event.currentTarget.value = "";
          setReuploadTargetId(null);
        }}
      />
    </div>
  );
}
