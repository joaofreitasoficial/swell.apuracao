"use client";

import { AlertCircle, Cloud, CloudOff } from "lucide-react";
import { useEffect, useState } from "react";

interface UnsavedChangesIndicatorProps {
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  lastSavedTime?: number;
  error?: Error | null;
}

/**
 * Indicador visual de mudanças não salvas
 * Mostra status de sincronização com o servidor
 */
export function UnsavedChangesIndicator({
  hasUnsavedChanges,
  isSaving,
  lastSavedTime,
  error,
}: UnsavedChangesIndicatorProps) {
  const [timeAgo, setTimeAgo] = useState<string>("");

  useEffect(() => {
    if (!lastSavedTime) return;

    const updateTime = () => {
      const now = Date.now();
      const diff = now - lastSavedTime;
      const seconds = Math.floor(diff / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);

      if (seconds < 60) {
        setTimeAgo(`${seconds}s atrás`);
      } else if (minutes < 60) {
        setTimeAgo(`${minutes}m atrás`);
      } else if (hours < 24) {
        setTimeAgo(`${hours}h atrás`);
      } else {
        setTimeAgo("Ontem");
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 10000); // atualizar a cada 10s

    return () => clearInterval(interval);
  }, [lastSavedTime]);

  // Prioridade: Erro > Salvando > Mudanças não salvas > Salvo

  if (error) {
    return (
      <div
        title={error.message}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-50 text-red-700 text-xs font-medium"
      >
        <CloudOff className="size-3.5" />
        <span className="hidden sm:inline">Erro ao salvar</span>
      </div>
    );
  }

  if (isSaving) {
    return (
      <div
        title="Salvando mudanças..."
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-50 text-blue-700 text-xs font-medium"
      >
        <Cloud className="size-3.5 animate-pulse" />
        <span className="hidden sm:inline">Salvando...</span>
      </div>
    );
  }

  if (hasUnsavedChanges) {
    return (
      <div
        title="Existem mudanças não salvas"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-50 text-amber-700 text-xs font-medium"
      >
        <AlertCircle className="size-3.5" />
        <span className="hidden sm:inline">Não salvo</span>
      </div>
    );
  }

  if (lastSavedTime) {
    return (
      <div
        title={`Salvo ${timeAgo}`}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-green-50 text-green-700 text-xs font-medium"
      >
        <Cloud className="size-3.5" />
        <span className="hidden sm:inline text-green-600">{timeAgo}</span>
      </div>
    );
  }

  return null;
}
