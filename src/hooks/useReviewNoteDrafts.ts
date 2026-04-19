import { useCallback, useEffect, useState } from "react";

/**
 * Hook para gerenciar drafts de notas de revisão com persistência
 * Salva automaticamente em sessionStorage
 */
export function useReviewNoteDrafts() {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [isHydrated, setIsHydrated] = useState(false);

  // Carregar drafts do sessionStorage ao montar
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("review:note-drafts");
      if (saved) {
        setDrafts(JSON.parse(saved));
      }
    } catch {
      // Falha silenciosa
    } finally {
      setIsHydrated(true);
    }
  }, []);

  // Salvar drafts no sessionStorage sempre que mudarem
  useEffect(() => {
    if (!isHydrated) return;
    try {
      sessionStorage.setItem("review:note-drafts", JSON.stringify(drafts));
    } catch {
      // Falha silenciosa
    }
  }, [drafts, isHydrated]);

  const updateDraft = useCallback((transactionId: string, note: string) => {
    setDrafts((current) => ({
      ...current,
      [transactionId]: note,
    }));
  }, []);

  const clearDraft = useCallback((transactionId: string) => {
    setDrafts((current) => {
      const next = { ...current };
      delete next[transactionId];
      return next;
    });
  }, []);

  const clearAllDrafts = useCallback(() => {
    setDrafts({});
  }, []);

  const getDraft = useCallback((transactionId: string): string | undefined => {
    return drafts[transactionId];
  }, [drafts]);

  const hasDraft = useCallback((transactionId: string): boolean => {
    return transactionId in drafts;
  }, [drafts]);

  return {
    drafts,
    isHydrated,
    updateDraft,
    clearDraft,
    clearAllDrafts,
    getDraft,
    hasDraft,
    draftCount: Object.keys(drafts).length,
  };
}
