export type AccessRole = "user" | "admin";

export type AccessStatus = "waitlisted" | "approved" | "suspended" | "blocked" | "deactivated";

export type AccessProfile = {
  userId: string;
  role: AccessRole;
  accessStatus: AccessStatus;
  accessStatusReason: string | null;
  approvedAt: string | null;
  approvedBy: string | null;
};

export const APPROVED_ACCESS_STATUS: AccessStatus = "approved";

export const isApprovedAccessProfile = (profile: AccessProfile | null | undefined) =>
  profile?.accessStatus === APPROVED_ACCESS_STATUS;

export const isApprovedAdminAccessProfile = (profile: AccessProfile | null | undefined) =>
  profile?.role === "admin" && profile.accessStatus === APPROVED_ACCESS_STATUS;
