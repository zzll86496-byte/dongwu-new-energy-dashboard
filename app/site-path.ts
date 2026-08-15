const configuredBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const SITE_BASE_PATH = configuredBasePath.replace(/\/$/, "");

export function sitePath(path = "/"): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const deploymentPath =
    SITE_BASE_PATH && normalizedPath !== "/" && normalizedPath.endsWith("/")
      ? `${normalizedPath.slice(0, -1)}.html`
      : normalizedPath;

  return `${SITE_BASE_PATH}${deploymentPath}`;
}
