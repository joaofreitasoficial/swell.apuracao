/**
 * Setup global para testes Vitest
 *
 * Configura:
 * - Polyfills (fetch, etc)
 * - Mocks globais (localStorage, sessionStorage)
 * - Extensões de expect()
 * - Cleanup automático entre testes
 */

import { expect, afterEach, vi } from 'vitest';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    key: (index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    },
    get length() {
      return Object.keys(store).length;
    },
  };
})();

// Mock sessionStorage
const sessionStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    key: (index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    },
    get length() {
      return Object.keys(store).length;
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
} as any;

// Cleanup automático após cada teste
afterEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  vi.clearAllMocks();
});

// Estender expect com validações customizadas
expect.extend({
  toHaveBeenCalledWithDelay(received: any, expectedAttempt: number, expectedDelay: number) {
    const calls = received.mock.calls;
    const found = calls.some(
      (call: any) => call[0] === expectedAttempt && call[1] === expectedDelay,
    );

    return {
      message: () =>
        `Expected function to have been called with attempt ${expectedAttempt} and delay ${expectedDelay}ms`,
      pass: found,
    };
  },
});
