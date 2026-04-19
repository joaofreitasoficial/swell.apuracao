import { useEffect, useState } from "react";

/**
 * Hook para persistir a aba ativa em localStorage
 * Quando o usuário volta à página, abre a mesma aba que estava vendo
 */
export function usePersistedTab<T extends string>(
  options: {
    key: string;
    defaultTab: T;
    onTabChange?: (tab: T) => void;
  }
) {
  const { key, defaultTab, onTabChange } = options;
  const [activeTab, setActiveTab] = useState<T>(defaultTab);
  const [isHydrated, setIsHydrated] = useState(false);

  // Carregar aba salva ao montar
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`tab:${key}`);
      if (saved) {
        setActiveTab(saved as T);
      }
    } catch {
      // Falha silenciosa
    } finally {
      setIsHydrated(true);
    }
  }, [key]);

  // Salvar aba ao mudar
  const changeTab = (newTab: T) => {
    try {
      localStorage.setItem(`tab:${key}`, newTab);
      setActiveTab(newTab);
      onTabChange?.(newTab);
    } catch {
      // Falha silenciosa em caso de quota excedida
      setActiveTab(newTab);
      onTabChange?.(newTab);
    }
  };

  return {
    activeTab,
    changeTab,
    isHydrated,
  };
}
