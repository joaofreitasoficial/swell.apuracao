"use client";

import { Check, CloudOff, LoaderCircle } from "lucide-react";

interface AutosaveStatusProps {
  isSaving: boolean;
  lastSavedAt: number;
  error: Error | null;
  draftCount?: number;
}

export function AutosaveStatus({
  isSaving,
  lastSavedAt,
  error,
  draftCount,
}: AutosaveStatusProps) {
  const now = Date.now();
  const secondsAgo = Math.floor((now - lastSavedAt) / 1000);

  let statusMessage = "";
  if (isSaving) {
    statusMessage = "Salvando...";
  } else if (error) {
    statusMessage = "Erro ao salvar";
  } else if (secondsAgo < 60) {
    statusMessage = `Salvo ${secondsAgo}s atrás`;
  } else {
    statusMessage = "Tudo salvo";
  }

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      {isSaving ? (
        <>
          <LoaderCircle className="size-3 animate-spin" />
          <span>{statusMessage}</span>
        </>
      ) : error ? (
        <>
          <CloudOff className="size-3 text-destructive" />
          <span className="text-destructive">{statusMessage}</span>
        </>
      ) : (
        <>
          <Check className="size-3 text-green-600" />
          <span>{statusMessage}</span>
          {draftCount ? (
            <span className="ml-1 text-xs text-amber-600">
              {draftCount} rascunho{draftCount !== 1 ? "s" : ""}
            </span>
          ) : null}
        </>
      )}
    </div>
  );
}
