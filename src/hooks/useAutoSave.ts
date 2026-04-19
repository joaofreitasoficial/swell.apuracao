import { useEffect, useRef, useState } from "react";

/**
 * Hook para autosave com debounce e cache em sessionStorage
 * Garante que mudanças sejam salvas periodicamente e recuperáveis
 */
export function useAutoSave<T extends Record<string, unknown>>(options: {
  key: string;
  value: T;
  onSave: (value: T) => Promise<void>;
  debounceMs?: number;
  enabled?: boolean;
}) {
  const { key, value, onSave, debounceMs = 500, enabled = true } = options;

  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number>(Date.now());
  const [error, setError] = useState<Error | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastValueRef = useRef<T>(value);

  // Recuperar draft do sessionStorage ao montar
  useEffect(() => {
    if (!enabled) return;

    try {
      const cached = sessionStorage.getItem(`draft:${key}`);
      if (cached) {
        const parsed = JSON.parse(cached) as T;
        // Aqui você pode implementar callback para restaurar o draft
        // Por enquanto, apenas lemos para validar que está lá
      }
    } catch {
      // Falha silenciosa em caso de parse inválido
    }
  }, [key, enabled]);

  // Debounced autosave
  useEffect(() => {
    if (!enabled) return;

    // Limpar timer anterior
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Se nada mudou, não fazer nada
    if (JSON.stringify(lastValueRef.current) === JSON.stringify(value)) {
      return;
    }

    // Salvar em cache local imediatamente (draft)
    try {
      sessionStorage.setItem(`draft:${key}`, JSON.stringify(value));
    } catch {
      // Falha silenciosa se sessionStorage não disponível
    }

    // Agendar save no servidor com debounce
    debounceTimerRef.current = setTimeout(async () => {
      try {
        setIsSaving(true);
        setError(null);
        await onSave(value);
        setLastSavedAt(Date.now());
        lastValueRef.current = value;

        // Limpar draft após salvar com sucesso
        sessionStorage.removeItem(`draft:${key}`);
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Erro ao salvar");
        setError(error);
        // Draft permanece em sessionStorage para retry
      } finally {
        setIsSaving(false);
      }
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [key, value, enabled, onSave, debounceMs]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    isSaving,
    lastSavedAt,
    error,
    // Forçar save imediato
    forceSave: async (valueToSave: T) => {
      try {
        setIsSaving(true);
        setError(null);
        await onSave(valueToSave);
        setLastSavedAt(Date.now());
        lastValueRef.current = valueToSave;
        sessionStorage.removeItem(`draft:${key}`);
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Erro ao salvar");
        setError(error);
        throw error;
      } finally {
        setIsSaving(false);
      }
    },
  };
}
