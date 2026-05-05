import { describe, expect, it } from "vitest";
import { appPath, nestedRoutePath, toLegacyAppRedirectPath } from "@/lib/routes";

describe("app route helpers", () => {
  it("builds the internal app home path", () => {
    expect(appPath()).toBe("/app");
    expect(appPath("/")).toBe("/app");
  });

  it("builds nested internal app paths", () => {
    expect(appPath("vehicles")).toBe("/app/vehicles");
    expect(appPath("/trip/ativa")).toBe("/app/trip/ativa");
  });

  it("converts legacy internal paths to the app namespace", () => {
    expect(toLegacyAppRedirectPath("/history")).toBe("/app/history");
    expect(toLegacyAppRedirectPath("/trip/123")).toBe("/app/trip/123");
  });

  it("normalizes absolute paths for nested route declarations", () => {
    expect(nestedRoutePath("/help/tickets")).toBe("help/tickets");
  });
});
