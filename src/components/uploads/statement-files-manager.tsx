"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  LoaderCircle,
  RefreshCcw,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";

import { StatementFileStatusBadge } from "@/components/uploads/statement-file-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { StatementFileRecord } from "@/types/domain";

type UploadStatus = "pending" | "uploading" | "processing" | "success" | "error";

type LocalUpload = {
  id: string;
  fileName: string;
  fileSize: number;
  progress: number;
  status: UploadStatus;
  error?: string;
  statementFileId?: string;
};

type StatementFilesManagerProps = {
  apuracaoId: string;
  files: StatementFileRecord[];
};

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function parseUploadResponse(responseText: string) {
  try {
    return JSON.parse(responseText || "{}") as {
      error?: string;
      success?: boolean;
    };
  } catch {
    return {
      error:
        responseText.includes("<!DOCTYPE") || responseText.includes("<html")
          ? "O servidor retornou um erro inesperado. Verifique os logs da Vercel."
          : "Falha ao interpretar a resposta do servidor.",
    };
  }
}

function getUploadStatusLabel(upload: LocalUpload) {
  if (upload.status === "error") {
    return upload.error ?? "Falha ao enviar o arquivo.";
  }

  if (upload.status === "success") {
    return "Upload e processamento concluidos.";
  }

  if (upload.status === "processing") {
    return "Arquivo enviado. Processando extrato agora...";
  }

  if (upload.status === "uploading") {
    return "Enviando arquivo para o servidor...";
  }

  return "Aguardando na fila para envio.";
}

export function StatementFilesManager({
  apuracaoId,
  files,
}: StatementFilesManagerProps) {
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  const [uploads, setUploads] = useState<LocalUpload[]>([]);
  const [isPending, startTransition] = useTransition();
  const reuploadInputRef = useRef<HTMLInputElement | null>(null);
  const [reuploadTargetId, setReuploadTargetId] = useState<string | null>(null);

  const uploadSummary = useMemo(() => {
    const pending = uploads.filter((upload) => upload.status === "pending").length;
    const uploading = uploads.filter((upload) => upload.status === "uploading").length;
    const processing = uploads.filter((upload) => upload.status === "processing").length;
    const failed = uploads.filter((upload) => upload.status === "error").length;
    const completed = uploads.filter((upload) => upload.status === "success").length;

    return {
      total: uploads.length,
      pending,
      uploading,
      processing,
      failed,
      completed,
    };
  }, [uploads]);

  const currentUpload = useMemo(
    () =>
      uploads.find((upload) => upload.status === "processing") ??
      uploads.find((upload) => upload.status === "uploading") ??
      uploads.find((upload) => upload.status === "pending") ??
      null,
    [uploads],
  );

  const batchProgress = useMemo(() => {
    if (uploadSummary.total === 0) {
      return 0;
    }

    return Math.round(
      ((uploadSummary.completed + uploadSummary.failed) / uploadSummary.total) * 100,
    );
  }, [uploadSummary]);

  const updateUpload = (localId: string, updater: (upload: LocalUpload) => LocalUpload) => {
    setUploads((current) =>
      current.map((upload) => (upload.id === localId ? updater(upload) : upload)),
    );
  };

  const uploadSingleFile = async (
    file: File,
    localId: string,
    statementFileId?: string,
  ) => {
    updateUpload(localId, (upload) => ({
      ...upload,
      status: "uploading",
      progress: 0,
      error: undefined,
    }));

    await new Promise<void>((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `/api/apuracoes/${apuracaoId}/statement-files`);

      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) {
          return;
        }

        const nextProgress = Math.min(
          100,
          Math.max(1, Math.round((event.loaded / event.total) * 100)),
        );

        updateUpload(localId, (upload) => ({
          ...upload,
          progress: nextProgress,
          status: "uploading",
        }));
      };

      xhr.upload.onload = () => {
        updateUpload(localId, (upload) => ({
          ...upload,
          progress: 100,
          status: "processing",
        }));
      };

      xhr.onload = () => {
        const response = parseUploadResponse(xhr.responseText || "");

        if (xhr.status >= 400 || response.error) {
          updateUpload(localId, (upload) => ({
            ...upload,
            status: "error",
            error: response.error ?? "Falha ao enviar o arquivo.",
          }));
          toast.error(`${file.name}: ${response.error ?? "Falha ao enviar o arquivo."}`);
          resolve();
          return;
        }

        updateUpload(localId, (upload) => ({
          ...upload,
          progress: 100,
          status: "success",
          statementFileId,
        }));

        toast.success(
          statementFileId
            ? `${file.name}: arquivo reenviado e processado.`
            : `${file.name}: arquivo enviado e processado.`,
        );
        router.refresh();
        resolve();
      };

      xhr.onerror = () => {
        updateUpload(localId, (upload) => ({
          ...upload,
          status: "error",
          error: "Falha de rede durante o upload.",
        }));
        toast.error(`${file.name}: falha de rede durante o upload.`);
        resolve();
      };

      const formData = new FormData();
      formData.set("file", file);

      if (statementFileId) {
        formData.set("statementFileId", statementFileId);
      }

      xhr.send(formData);
    });
  };

  const handleFiles = async (fileList: FileList | null, statementFileId?: string) => {
    if (!fileList || fileList.length === 0) {
      return;
    }

    const pdfFiles = Array.from(fileList).filter(
      (file) => file.type === "application/pdf",
    );

    if (pdfFiles.length === 0) {
      toast.error("Selecione ao menos um arquivo PDF valido.");
      return;
    }

    const queueItems = pdfFiles.map((file) => ({
      id: `${file.name}-${crypto.randomUUID()}`,
      fileName: file.name,
      fileSize: file.size,
      progress: 0,
      status: "pending" as UploadStatus,
      statementFileId,
    }));

    setUploads((current) => [...queueItems, ...current]);

    for (const [index, file] of pdfFiles.entries()) {
      await uploadSingleFile(file, queueItems[index].id, statementFileId);
    }
  };

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
      const payload = (await response.json()) as { error?: string };

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
      const payload = (await response.json()) as { error?: string };

      if (!response.ok || payload.error) {
        toast.error(payload.error ?? "Falha ao reprocessar arquivo.");
        return;
      }

      toast.success("Reprocessamento iniciado.");
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-2xl tracking-tight">
                Upload de extratos
              </CardTitle>
              <p className="text-sm leading-6 text-muted-foreground">
                Voce pode enviar varios PDFs de uma unica vez. O sistema coloca
                todos na fila e mostra qual arquivo esta sendo processado no momento.
              </p>
            </div>
            <div className="text-right text-sm text-muted-foreground">
              <p>{files.length} arquivos registrados</p>
              <p>
                {uploadSummary.pending} na fila • {uploadSummary.uploading} enviando •{" "}
                {uploadSummary.processing} processando
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <label
            className={`flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
              isDragging
                ? "border-primary bg-primary/5"
                : "border-border bg-muted/20 hover:border-primary/50"
            }`}
            onDragEnter={() => setIsDragging(true)}
            onDragLeave={() => setIsDragging(false)}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setIsDragging(false);
              void handleFiles(event.dataTransfer.files);
            }}
          >
            <UploadCloud className="size-10 text-primary" />
            <h3 className="mt-4 text-xl font-semibold tracking-tight">
              Arraste varios PDFs aqui ou clique para selecionar
            </h3>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
              Suporte a multiplos arquivos em lote, retry, exclusao e reenvio.
              Limite por arquivo: 20 MB.
            </p>
            <input
              type="file"
              accept="application/pdf"
              multiple
              className="hidden"
              onChange={(event) => {
                void handleFiles(event.target.files);
                event.currentTarget.value = "";
              }}
            />
          </label>

          {uploads.length > 0 ? (
            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border bg-card/70 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      Lote em andamento
                    </p>
                    <p className="text-lg font-semibold">
                      {currentUpload
                        ? currentUpload.status === "processing"
                          ? `Processando agora: ${currentUpload.fileName}`
                          : currentUpload.status === "uploading"
                            ? `Enviando agora: ${currentUpload.fileName}`
                            : `Proximo da fila: ${currentUpload.fileName}`
                        : "Nenhum arquivo em processamento no momento"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {uploadSummary.completed} concluidos • {uploadSummary.failed} com erro •{" "}
                      {uploadSummary.total} no lote
                    </p>
                  </div>
                  <div className="min-w-44 text-right">
                    <p className="text-sm font-medium">{batchProgress}% do lote concluido</p>
                    <p className="text-xs text-muted-foreground">
                      {uploadSummary.completed + uploadSummary.failed}/{uploadSummary.total} finalizados
                    </p>
                  </div>
                </div>
                <div className="mt-4 h-2 rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-primary transition-all"
                    style={{ width: `${batchProgress}%` }}
                  />
                </div>
              </div>

              <div className="space-y-3">
                {uploads.map((upload) => (
                  <div
                    key={upload.id}
                    className="rounded-2xl border border-border/70 bg-background/70 p-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-medium">{upload.fileName}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatBytes(upload.fileSize)} • {getUploadStatusLabel(upload)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {upload.status === "processing" ? "Processando" : `${upload.progress}%`}
                        </p>
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                          {upload.status}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-muted">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          upload.status === "error"
                            ? "bg-destructive"
                            : upload.status === "processing"
                              ? "animate-pulse bg-amber-500"
                              : upload.status === "success"
                                ? "bg-emerald-500"
                                : "bg-primary"
                        }`}
                        style={{
                          width: `${
                            upload.status === "processing"
                              ? 100
                              : Math.max(4, upload.progress)
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl tracking-tight">
            Arquivos enviados
          </CardTitle>
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

      <input
        ref={reuploadInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(event) => {
          if (reuploadTargetId) {
            void handleFiles(event.target.files, reuploadTargetId);
          }
          event.currentTarget.value = "";
          setReuploadTargetId(null);
        }}
      />
    </div>
  );
}
