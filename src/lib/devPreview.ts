/**
 * Dev Preview Mode — temporary development shortcut.
 *
 * Allows bypassing authentication in preview/local environments
 * so developers can navigate the app without logging in every time.
 *
 * Controlled by the VITE_ENABLE_DEV_PREVIEW env var.
 * When the env var is not "true", every function here is a no-op
 * and the preview mode cannot be activated.
 */

const SESSION_KEY = "space-truck-dev-preview";

/** Whether the env var explicitly enables dev-preview. */
function envEnabled(): boolean {
  return import.meta.env.VITE_ENABLE_DEV_PREVIEW === "true";
}

/** Optional extra safety: only allow on localhost / Vercel preview hosts. */
function isPreviewHost(): boolean {
  const { hostname } = window.location;
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".vercel.app")
  );
}

/**
 * Whether the dev-preview feature is available in this environment.
 * Both the env var AND a compatible host are required.
 */
export function isDevPreviewEnabled(): boolean {
  return envEnabled() && isPreviewHost();
}

/** Activate the preview session (sets a sessionStorage flag). */
export function activateDevPreview(): void {
  if (!isDevPreviewEnabled()) return;
  sessionStorage.setItem(SESSION_KEY, "true");
}

/** Deactivate the preview session. */
export function deactivateDevPreview(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

/**
 * Whether the user is currently in dev-preview mode.
 * Returns true ONLY when the env var is enabled AND the session flag is set.
 */
export function isDevPreviewActive(): boolean {
  if (!isDevPreviewEnabled()) return false;
  return sessionStorage.getItem(SESSION_KEY) === "true";
}
