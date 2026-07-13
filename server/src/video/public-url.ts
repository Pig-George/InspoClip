export interface ModelVideoUrlEnv {
  MODEL_VIDEO_PUBLIC_BASE_URL?: string;
  MODEL_VIDEO_VERIFY_BASE_URL?: string;
  PUBLIC_BASE_URL?: string;
}

export interface ModelVideoTunnelProvider {
  getPublicBaseUrl(): Promise<string>;
  refreshPublicBaseUrl(): Promise<string>;
}

export interface ModelVideoUrlProvider {
  getPublicBaseUrl(): Promise<string>;
  refreshPublicBaseUrl(): Promise<string | null>;
  toVerifyUrl(publicUrl: string): string;
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

export function createModelVideoUrlProvider(
  env: ModelVideoUrlEnv,
  port: number,
  tunnelProvider?: ModelVideoTunnelProvider | null,
): ModelVideoUrlProvider {
  const configured = getModelVideoBaseUrls(env, port);
  const explicitVerifyBaseUrl = configuredBaseUrl(env.MODEL_VIDEO_VERIFY_BASE_URL);
  let currentPublicBaseUrl = configured.publicBaseUrl;

  const usePublicBaseUrl = (baseUrl: string): string => {
    currentPublicBaseUrl = trimBaseUrl(baseUrl.trim());
    return currentPublicBaseUrl;
  };

  return {
    async getPublicBaseUrl() {
      if (!tunnelProvider) return currentPublicBaseUrl;
      try {
        return usePublicBaseUrl(await tunnelProvider.getPublicBaseUrl());
      } catch (error) {
        console.warn(`Unable to load tunnel manager URL, using fallback video public URL: ${error instanceof Error ? error.message : String(error)}`);
        return currentPublicBaseUrl;
      }
    },
    async refreshPublicBaseUrl() {
      if (!tunnelProvider) return null;
      return usePublicBaseUrl(await tunnelProvider.refreshPublicBaseUrl());
    },
    toVerifyUrl(publicUrl: string) {
      const verifyBaseUrl = explicitVerifyBaseUrl ?? new URL(publicUrl).origin;
      return `${verifyBaseUrl}${modelVideoAccessPath(publicUrl)}`;
    },
  };
}
