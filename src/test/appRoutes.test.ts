import { describe, expect, it } from "vitest";
import { appPath, legacyToAppPath, nestedRoutePath } from "@/lib/routes";

describe("app route helpers", () => {
  it("builds the internal app home path", () => {
    expect(appPath()).toBe("/app");
    expect(appPath("")).toBe("/app");
    expect(appPath("/")).toBe("/app");
    expect(appPath("/app")).toBe("/app");
  });

  it("builds nested internal app paths", () => {
    expect(appPath("vehicles")).toBe("/app/vehicles");
    expect(appPath("/vehicles")).toBe("/app/vehicles");
    expect(appPath("/trip/ativa")).toBe("/app/trip/ativa");
  });

  it("does not double-prefix already-namespaced app paths", () => {
    expect(appPath("/app/history")).toBe("/app/history");
    expect(appPath("/app/trip/ativa")).toBe("/app/trip/ativa");
  });

  it("converts legacy internal paths to the app namespace", () => {
    expect(legacyToAppPath("/")).toBe("/app");
    expect(legacyToAppPath("/history")).toBe("/app/history");
    expect(legacyToAppPath("/trip/123")).toBe("/app/trip/123");
    expect(legacyToAppPath("/history?page=2#section")).toBe("/app/history?page=2#section");
  });

  it("normalizes paths for nested route declarations", () => {
    expect(nestedRoutePath("/help/tickets")).toBe("help/tickets");
    expect(nestedRoutePath("help/tickets")).toBe("help/tickets");
    expect(nestedRoutePath("//help/tickets")).toBe("help/tickets");
  });
});
