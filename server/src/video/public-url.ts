export interface ModelVideoUrlEnv {
  MODEL_VIDEO_PUBLIC_BASE_URL?: string;
  MODEL_VIDEO_VERIFY_BASE_URL?: string;
  PUBLIC_BASE_URL?: string;
}

function trimBaseUrl(value: string): string {
  return value.replace(/\/+$/, '');
}

function configuredBaseUrl(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimBaseUrl(trimmed) : undefined;
}

export function getModelVideoBaseUrls(env: ModelVideoUrlEnv, port: number): { publicBaseUrl: string; verifyBaseUrl: string } {
  const publicBaseUrl = configuredBaseUrl(env.MODEL_VIDEO_PUBLIC_BASE_URL)
    ?? configuredBaseUrl(env.PUBLIC_BASE_URL)
    ?? `http://localhost:${port}`;
  const verifyBaseUrl = configuredBaseUrl(env.MODEL_VIDEO_VERIFY_BASE_URL) ?? publicBaseUrl;
  return { publicBaseUrl, verifyBaseUrl };
}

export function modelVideoAccessPath(publicUrl: string): string {
  const url = new URL(publicUrl);
  return `${url.pathname}${url.search}`;
}
