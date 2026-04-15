import { describe, expect, it } from "vitest";
import { parseAdvancePercentInput } from "@/lib/freightReceivableInput";

describe("parseAdvancePercentInput", () => {
  it.each([
    ["80", 80],
    ["80%", 80],
    ["80/20", 80],
    ["70/30", 70],
    ["60/40", 60],
  ])("interpreta '%s' corretamente", (input, expected) => {
    const parsed = parseAdvancePercentInput(input);
    expect(parsed.value).toBe(expected);
    expect(parsed.error).toBeUndefined();
  });

  it("bloqueia proporção inválida", () => {
    const parsed = parseAdvancePercentInput("80/10");
    expect(parsed.value).toBeNull();
    expect(parsed.error).toContain("feche em 100");
  });

  it("bloqueia texto ambíguo", () => {
    const parsed = parseAdvancePercentInput("abc");
    expect(parsed.value).toBeNull();
    expect(parsed.error).toContain("Não consegui entender");
  });
});
