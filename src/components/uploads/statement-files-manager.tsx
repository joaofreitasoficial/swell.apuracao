"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, RefreshCcw, Trash2, UploadCloud } from "lucide-react";
import { toast } from "sonner";

import { StatementFileStatusBadge } from "@/components/uploads/statement-file-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { StatementFileRecord } from "@/types/domain";

type LocalUpload = {
  id: string;
  fileName: string;
  progress: number;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
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
    const uploading = uploads.filter((upload) => upload.status === "uploading").length;
    const failed = uploads.filter((upload) => upload.status === "error").length;

    return { uploading, failed };
  }, [uploads]);

  const uploadSingleFile = async (file: File, statementFileId?: string) => {
    const localId = `${file.name}-${crypto.randomUUID()}`;

    setUploads((current) => [
      {
        id: localId,
        fileName: file.name,
        progress: 0,
        status: "pending",
      },
      ...current,
    ]);

    await new Promise<void>((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `/api/apuracoes/${apuracaoId}/statement-files`);

      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) {
          return;
        }

        const nextProgress = Math.round((event.loaded / event.total) * 100);

        setUploads((current) =>
          current.map((upload) =>
            upload.id === localId
              ? { ...upload, progress: nextProgress, status: "uploading" }
              : upload,
          ),
        );
      };

      xhr.onload = () => {
        const response = JSON.parse(xhr.responseText || "{}") as {
          error?: string;
          success?: boolean;
        };

        if (xhr.status >= 400 || response.error) {
          setUploads((current) =>
            current.map((upload) =>
              upload.id === localId
                ? {
                    ...upload,
                    progress: upload.progress || 0,
                    status: "error",
                    error: response.error ?? "Falha ao enviar o arquivo.",
                  }
                : upload,
            ),
          );
          toast.error(response.error ?? "Falha ao enviar o arquivo.");
          resolve();
          return;
        }

        setUploads((current) =>
          current.map((upload) =>
            upload.id === localId
              ? { ...upload, progress: 100, status: "success" }
              : upload,
          ),
        );
        toast.success(
          statementFileId
            ? "Arquivo reenviado e processado."
            : "Arquivo enviado e processado.",
        );
        router.refresh();
        resolve();
      };

      xhr.onerror = () => {
        setUploads((current) =>
          current.map((upload) =>
            upload.id === localId
              ? {
                  ...upload,
                  status: "error",
                  error: "Falha de rede durante o upload.",
                }
              : upload,
          ),
        );
        toast.error("Falha de rede durante o upload.");
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

    for (const file of pdfFiles) {
      await uploadSingleFile(file, statementFileId);
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

      toast.success("Arquivo excluído com sucesso.");
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
                Envie um ou mais PDFs. O sistema faz a leitura inicial, detecta
                banco/conta, salva texto bruto e registra logs por arquivo.
              </p>
            </div>
            <div className="text-right text-sm text-muted-foreground">
              <p>{files.length} arquivos registrados</p>
              <p>
                {uploadSummary.uploading} enviando • {uploadSummary.failed} com erro
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
              Arraste os PDFs aqui ou clique para selecionar
            </h3>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
              Suporte a múltiplos arquivos, retry, exclusão e reenvio. Limite
              por arquivo: 20 MB.
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
            <div className="mt-6 space-y-3">
              {uploads.map((upload) => (
                <div
                  key={upload.id}
                  className="rounded-2xl border border-border/70 bg-background/70 p-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium">{upload.fileName}</p>
                      <p className="text-sm text-muted-foreground">
                        {upload.status === "error"
                          ? upload.error
                          : upload.status === "success"
                            ? "Upload e processamento concluídos."
                            : "Enviando arquivo..."}
                      </p>
                    </div>
                    <span className="text-sm font-medium">{upload.progress}%</span>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-muted">
                    <div
                      className={`h-2 rounded-full ${
                        upload.status === "error" ? "bg-destructive" : "bg-primary"
                      }`}
                      style={{ width: `${upload.progress}%` }}
                    />
                  </div>
                </div>
              ))}
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
                      <span>{file.pageCount ? `${file.pageCount} páginas` : "Páginas pendentes"}</span>
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
              Nenhum PDF enviado ainda para esta apuração.
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
