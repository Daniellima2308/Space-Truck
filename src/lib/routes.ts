export const APP_BASE_PATH = "/app";
export const APP_HOME_PATH = APP_BASE_PATH;

export function appPath(path = "") {
  if (!path || path === "/") {
    return APP_HOME_PATH;
  }

  return `${APP_BASE_PATH}${path.startsWith("/") ? path : `/${path}`}`;
}

export function toLegacyAppRedirectPath(pathname: string) {
  return appPath(pathname);
}

export function nestedRoutePath(path: string) {
  return path.replace(/^\//, "");
}
