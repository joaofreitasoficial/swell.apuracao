/**
 * Monitoring de performance
 * Rastreia Core Web Vitals e operações lentas
 */

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private observers: PerformanceObserver[] = [];

  /**
   * Inicializar monitoramento de Core Web Vitals
   */
  initializeCoreWebVitals() {
    // Largest Contentful Paint (LCP)
    if ("PerformanceObserver" in window) {
      try {
        const lcpObserver = new PerformanceObserver((entryList) => {
          const lastEntry = entryList.getEntries().pop();
          if (lastEntry) {
            this.recordMetric({
              name: "LCP",
              value: lastEntry.startTime,
              unit: "ms",
            });
          }
        });

        lcpObserver.observe({ entryTypes: ["largest-contentful-paint"] });
        this.observers.push(lcpObserver);
      } catch {
        console.warn("LCP monitoring não disponível");
      }

      // First Input Delay (FID)
      try {
        const fidObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          entries.forEach((entry) => {
            this.recordMetric({
              name: "FID",
              value: (entry as any).processingDuration,
              unit: "ms",
            });
          });
        });

        fidObserver.observe({ entryTypes: ["first-input"] });
        this.observers.push(fidObserver);
      } catch {
        console.warn("FID monitoring não disponível");
      }

      // Cumulative Layout Shift (CLS)
      try {
        const clsObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          let clsValue = 0;
          entries.forEach((entry) => {
            if ((entry as any).hadRecentInput) return;
            clsValue += (entry as any).value;
          });

          this.recordMetric({
            name: "CLS",
            value: clsValue,
            unit: "",
          });
        });

        clsObserver.observe({ entryTypes: ["layout-shift"] });
        this.observers.push(clsObserver);
      } catch {
        console.warn("CLS monitoring não disponível");
      }
    }
  }

  /**
   * Medir tempo de execução de uma função
   */
  measure<T>(
    label: string,
    fn: () => T,
  ): T {
    const startTime = performance.now();

    try {
      return fn();
    } finally {
      const endTime = performance.now();
      const duration = endTime - startTime;

      this.recordMetric({
        name: label,
        value: duration,
        unit: "ms",
      });

      // Log se for lento (>100ms)
      if (duration > 100) {
        console.warn(`Operação lenta: ${label} levou ${duration.toFixed(2)}ms`);
      }
    }
  }

  /**
   * Medir tempo de execução de função async
   */
  async measureAsync<T>(
    label: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    const startTime = performance.now();

    try {
      return await fn();
    } finally {
      const endTime = performance.now();
      const duration = endTime - startTime;

      this.recordMetric({
        name: label,
        value: duration,
        unit: "ms",
      });

      // Log se for lento (>200ms)
      if (duration > 200) {
        console.warn(`Operação async lenta: ${label} levou ${duration.toFixed(2)}ms`);
      }
    }
  }

  /**
   * Registrar métrica customizada
   */
  recordMetric(metric: Omit<PerformanceMetric, "timestamp">) {
    this.metrics.push({
      ...metric,
      timestamp: Date.now(),
    });

    // Manter apenas últimas 100 métricas
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }
  }

  /**
   * Obter estatísticas de performance
   */
  getStats(name: string) {
    const filtered = this.metrics.filter((m) => m.name === name);

    if (filtered.length === 0) {
      return null;
    }

    const values = filtered.map((m) => m.value);
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);

    return { avg, min, max, count: filtered.length };
  }

  /**
   * Exportar todas as métricas
   */
  export() {
    return {
      metrics: this.metrics,
      summary: {
        totalMetrics: this.metrics.length,
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Limpar recursos
   */
  destroy() {
    this.observers.forEach((observer) => observer.disconnect());
    this.observers = [];
    this.metrics = [];
  }
}

export const performanceMonitor = new PerformanceMonitor();

/**
 * Hook React para monitoramento
 */
export function usePerformanceMonitoring(label: string) {
  return {
    measure: <T,>(fn: () => T) => performanceMonitor.measure(label, fn),
    measureAsync: <T,>(fn: () => Promise<T>) =>
      performanceMonitor.measureAsync(label, fn),
    getStats: () => performanceMonitor.getStats(label),
  };
}
