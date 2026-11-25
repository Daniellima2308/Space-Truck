import "@testing-library/jest-dom";
import type {} from "vitest/jsdom";
import { vi } from "vitest";

// Os testes do navegador usam o armazenamento isolado do jsdom no Node 26.
vi.stubGlobal("localStorage", jsdom.window.localStorage);
vi.stubGlobal("sessionStorage", jsdom.window.sessionStorage);

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
