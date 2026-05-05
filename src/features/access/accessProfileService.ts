import { supabase } from "@/integrations/supabase/client";
import type { AccessProfile } from "./accessTypes";

type ProfileAccessRow = {
  user_id: string;
  role: AccessProfile["role"];
  access_status: AccessProfile["accessStatus"];
  access_status_reason: string | null;
  approved_at: string | null;
  approved_by: string | null;
};

type BetaProfileAccessClient = {
  from(table: "profiles"): {
    select(columns: string): {
      eq(column: "user_id", value: string): {
        maybeSingle(): Promise<{ data: ProfileAccessRow | null; error: Error | null }>;
      };
    };
  };
};

const mapAccessProfile = (row: ProfileAccessRow): AccessProfile => ({
  userId: row.user_id,
  role: row.role,
  accessStatus: row.access_status,
  accessStatusReason: row.access_status_reason,
  approvedAt: row.approved_at,
  approvedBy: row.approved_by,
});

export async function getAccessProfile(userId: string): Promise<AccessProfile | null> {
  // TODO: remove this narrow cast after regenerating Supabase types from the live schema.
  const supabaseWithBetaProfileColumns = supabase as unknown as BetaProfileAccessClient;

  const { data, error } = await supabaseWithBetaProfileColumns
    .from("profiles")
    .select("user_id, role, access_status, access_status_reason, approved_at, approved_by")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapAccessProfile(data) : null;
}
