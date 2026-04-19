import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";

/**
 * Hook otimizado para virtualização com TanStack Virtual
 * Melhora performance com grandes listas
 */
export function useOptimizedVirtualizer<T>(options: {
  items: T[];
  estimateSize: number;
  overscan?: number;
  gap?: number;
}) {
  const { items, estimateSize, overscan = 10, gap = 0 } = options;
  const parentRef = useRef<HTMLDivElement | null>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
    gap,
    // Lazy load quando próximo do final
    measureElement:
      typeof window !== "undefined" && navigator.userAgent.indexOf("jsdom") === -1
        ? (element) => element?.getBoundingClientRect().height
        : undefined,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();

  const paddingTop = virtualItems.length > 0 ? virtualItems?.[0]?.start || 0 : 0;
  const paddingBottom =
    virtualItems.length > 0
      ? totalSize - (virtualItems?.[virtualItems.length - 1]?.end || 0)
      : 0;

  return {
    parentRef,
    virtualizer,
    virtualItems,
    paddingTop,
    paddingBottom,
    totalSize,
  };
}

/**
 * Hook para scroll infinito com virtualização
 */
export function useInfiniteVirtualScroll<T>(options: {
  items: T[];
  loadMore: () => Promise<void>;
  hasMore: boolean;
  isLoading: boolean;
  estimateSize: number;
}) {
  const { items, loadMore, hasMore, isLoading, estimateSize } = options;
  const parentRef = useRef<HTMLDivElement | null>(null);

  const virtualizer = useVirtualizer({
    count: items.length + (hasMore ? 1 : 0),
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan: 10,
    gap: 0,
  });

  const virtualItems = virtualizer.getVirtualItems();

  // Detectar quando chegou perto do final
  const lastVirtualItem = virtualItems?.[virtualItems.length - 1];
  if (
    lastVirtualItem &&
    lastVirtualItem.index >= items.length - 1 &&
    hasMore &&
    !isLoading
  ) {
    void loadMore();
  }

  return {
    parentRef,
    virtualizer,
    virtualItems,
  };
}
