import { useQuery } from "@tanstack/react-query";
import { getAccessProfile } from "./accessProfileService";

export const accessProfileQueryKey = (userId: string | undefined) => ["access-profile", userId] as const;

export function useAccessProfile(userId: string | undefined) {
  return useQuery({
    queryKey: accessProfileQueryKey(userId),
    queryFn: () => getAccessProfile(userId as string),
    enabled: Boolean(userId),
    staleTime: 30_000,
    retry: 1,
  });
}
