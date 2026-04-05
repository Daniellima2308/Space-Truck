/**
 * Sanitize a string for use as a filename segment.
 * Applies NFD (Canonical Decomposition) to split accented characters into base
 * character + combining mark, strips the combining marks, then lowercases and
 * replaces any remaining non-alphanumeric runs with hyphens.
 * Returns a safe fallback when sanitization would otherwise produce an empty string.
 */
export function sanitizeSegment(s: string): string {
  const sanitized = s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return sanitized || "untitled";
}

/** Truncate a string to maxLen, appending an ellipsis if needed. */
export function truncate(s: string, maxLen: number): string {
  if (maxLen <= 0) return "";
  if (s.length <= maxLen) return s;
  if (maxLen === 1) return "…";
  return s.slice(0, maxLen - 1) + "…";
}
