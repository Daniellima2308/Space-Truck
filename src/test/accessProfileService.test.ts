import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAccessProfile } from "@/features/access/accessProfileService";

const maybeSingleMock = vi.fn();
const eqMock = vi.fn(() => ({ maybeSingle: maybeSingleMock }));
const selectMock = vi.fn(() => ({ eq: eqMock }));
const fromMock = vi.fn(() => ({ select: selectMock }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: fromMock,
  },
}));

describe("getAccessProfile", () => {
  beforeEach(() => {
    fromMock.mockClear();
    selectMock.mockClear();
    eqMock.mockClear();
    maybeSingleMock.mockReset();
  });

  it("maps a profile access row into the app access model", async () => {
    maybeSingleMock.mockResolvedValueOnce({
      data: {
        user_id: "user-123",
        role: "admin",
        access_status: "approved",
        access_status_reason: "manual_admin_bootstrap",
        approved_at: "2026-05-04T00:00:00Z",
        approved_by: "user-123",
      },
      error: null,
    });

    await expect(getAccessProfile("user-123")).resolves.toEqual({
      userId: "user-123",
      role: "admin",
      accessStatus: "approved",
      accessStatusReason: "manual_admin_bootstrap",
      approvedAt: "2026-05-04T00:00:00Z",
      approvedBy: "user-123",
    });

    expect(fromMock).toHaveBeenCalledWith("profiles");
    expect(selectMock).toHaveBeenCalledWith("user_id, role, access_status, access_status_reason, approved_at, approved_by");
    expect(eqMock).toHaveBeenCalledWith("user_id", "user-123");
  });

  it("returns null when the profile row does not exist", async () => {
    maybeSingleMock.mockResolvedValueOnce({ data: null, error: null });

    await expect(getAccessProfile("missing-user")).resolves.toBeNull();
  });

  it("throws when Supabase returns an error", async () => {
    const error = new Error("profiles query failed");
    maybeSingleMock.mockResolvedValueOnce({ data: null, error });

    await expect(getAccessProfile("user-123")).rejects.toThrow("profiles query failed");
  });
});
