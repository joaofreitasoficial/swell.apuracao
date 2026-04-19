import { useEffect, useState, useRef } from "react";

/**
 * Hook para lazy loading com Intersection Observer
 * Carrega conteúdo apenas quando visível na tela
 */
export function useLazyLoad<T>(options: {
  key: string;
  loader: () => Promise<T>;
  initialData?: T;
  threshold?: number;
}) {
  const { key, loader, initialData, threshold = 0.1 } = options;
  const [data, setData] = useState<T | null>(initialData ?? null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<HTMLDivElement | null>(null);

  // Setup Intersection Observer para detectar quando elemento está visível
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isLoading && !data) {
          setIsVisible(true);
        }
      },
      { threshold },
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [isLoading, data]);

  // Carregador acionado quando visível
  useEffect(() => {
    if (!isVisible || data || isLoading) return;

    const load = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const result = await loader();
        setData(result);
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Erro ao carregar");
        setError(error);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [isVisible, data, isLoading, loader]);

  const retry = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await loader();
      setData(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Erro ao carregar");
      setError(error);
    } finally {
      setIsLoading(false);
    }
  };

  return { elementRef, data, isLoading, error, isVisible, retry };
}

/**
 * Hook para lazy load de components (code splitting)
 */
export function useLazyComponent(options: {
  componentLoader: () => Promise<{ default: React.ComponentType<any> }>;
}) {
  const [Component, setComponent] = useState<React.ComponentType<any> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const load = async () => {
    try {
      setIsLoading(true);
      const module = await options.componentLoader();
      setComponent(() => module.default);
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Erro ao carregar componente");
      setError(error);
    } finally {
      setIsLoading(false);
    }
  };

  return { Component, isLoading, error, load };
}
