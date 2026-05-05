export const APP_BASE_PATH = "/app";
export const APP_HOME_PATH = APP_BASE_PATH;

export function appPath(path = "") {
  if (!path || path === "/") {
    return APP_HOME_PATH;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (normalizedPath === APP_BASE_PATH || normalizedPath.startsWith(`${APP_BASE_PATH}/`)) {
    return normalizedPath;
  }

  return `${APP_BASE_PATH}${normalizedPath}`;
}

export function legacyToAppPath(pathname: string) {
  return appPath(pathname);
}

export function nestedRoutePath(path: string) {
  return path.replace(/^\/+/, "");
}
