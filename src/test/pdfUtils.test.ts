import { describe, it, expect } from "vitest";
import { sanitizeSegment, truncate } from "@/lib/pdfUtils";

describe("sanitizeSegment", () => {
  it("lowercases and preserves alphanumerics", () => {
    expect(sanitizeSegment("ABC123")).toBe("abc123");
  });

  it("replaces spaces and slashes with hyphens", () => {
    expect(sanitizeSegment("Este Mês/Período")).toBe("este-mes-periodo");
  });

  it("strips accents via NFD decomposition", () => {
    expect(sanitizeSegment("São Paulo")).toBe("sao-paulo");
    expect(sanitizeSegment("Ação")).toBe("acao");
    expect(sanitizeSegment("Março")).toBe("marco");
  });

  it("collapses multiple separators into one hyphen", () => {
    expect(sanitizeSegment("A  --  B")).toBe("a-b");
  });

  it("trims leading and trailing hyphens", () => {
    expect(sanitizeSegment("--test--")).toBe("test");
  });

  it("returns untitled for empty string", () => {
    expect(sanitizeSegment("")).toBe("untitled");
  });

  it("returns untitled for strings with only symbols/emojis", () => {
    expect(sanitizeSegment("🚛 🚚")).toBe("untitled");
    expect(sanitizeSegment("!@#$%")).toBe("untitled");
  });

  it("handles a realistic plate string", () => {
    expect(sanitizeSegment("ABC-1D23")).toBe("abc-1d23");
  });

  it("handles a realistic date string from formatDate (dd/mm/yyyy)", () => {
    expect(sanitizeSegment("05/04/2026")).toBe("05-04-2026");
  });

  it("handles a period label with accent", () => {
    expect(sanitizeSegment("Este Mês")).toBe("este-mes");
  });
});

describe("truncate", () => {
  it("returns the string unchanged when shorter than maxLen", () => {
    expect(truncate("hello", 10)).toBe("hello");
  });

  it("returns the string unchanged when equal to maxLen", () => {
    expect(truncate("hello", 5)).toBe("hello");
  });

  it("truncates and appends ellipsis when longer than maxLen", () => {
    expect(truncate("hello world", 8)).toBe("hello w…");
  });

  it("returns empty string for maxLen <= 0", () => {
    expect(truncate("hello", 0)).toBe("");
    expect(truncate("hello", -5)).toBe("");
  });

  it("returns just the ellipsis for maxLen === 1", () => {
    expect(truncate("hello", 1)).toBe("…");
  });

  it("returns single char + ellipsis for maxLen === 2", () => {
    expect(truncate("hello", 2)).toBe("h…");
  });

  it("handles strings with accented characters without corrupting them", () => {
    const s = "Volvo FH 540 — ABC1D23";
    expect(truncate(s, 13)).toBe("Volvo FH 540…");
  });

  it("returns empty string unchanged for maxLen larger than empty string", () => {
    expect(truncate("", 5)).toBe("");
  });
});
