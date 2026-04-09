import { describe, expect, it } from "vitest";
import { formatDate } from "@/lib/calculations";

describe("formatDate", () => {
  it("formata YYYY-MM-DD sem deslocar dia por timezone", () => {
    expect(formatDate("2026-04-08")).toBe("08/04/2026");
  });

  it("retorna marcador para data inválida", () => {
    expect(formatDate("2026-02-30")).toBe("—");
    expect(formatDate("invalida")).toBe("—");
    expect(formatDate("Thu Apr 08 2026")).toBe("—");
  });

  it("aceita timestamp ISO completo", () => {
    expect(formatDate("2026-04-08T12:00:00.000Z")).toBeTruthy();
  });
});
