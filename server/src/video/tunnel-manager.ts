export interface TunnelManagerEnv {
  TUNNEL_MANAGER_URL?: string;
}

export interface TunnelManagerClient {
  getPublicBaseUrl(): Promise<string>;
  refreshPublicBaseUrl(): Promise<string>;
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

function trimBaseUrl(value: string): string {
  return value.replace(/\/+$/, '');
}

function configuredBaseUrl(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimBaseUrl(trimmed) : undefined;
}

async function readPublicBaseUrl(response: Response): Promise<string> {
  if (!response.ok) throw new Error(`Tunnel manager responded with HTTP ${response.status}`);
  const body = await response.json() as { publicBaseUrl?: unknown; url?: unknown };
  const publicBaseUrl = typeof body.publicBaseUrl === 'string' ? body.publicBaseUrl : body.url;
  if (typeof publicBaseUrl !== 'string' || !publicBaseUrl.trim()) {
    throw new Error('Tunnel manager response did not include publicBaseUrl');
  }
  return trimBaseUrl(publicBaseUrl.trim());
}

export function createTunnelManagerClient(
  env: TunnelManagerEnv,
  fetchImpl: FetchLike = fetch,
): TunnelManagerClient | null {
  const managerBaseUrl = configuredBaseUrl(env.TUNNEL_MANAGER_URL);
  if (!managerBaseUrl) return null;

  return {
    async getPublicBaseUrl() {
      return readPublicBaseUrl(await fetchImpl(`${managerBaseUrl}/url`));
    },
    async refreshPublicBaseUrl() {
      return readPublicBaseUrl(await fetchImpl(`${managerBaseUrl}/refresh`, { method: 'POST' }));
    },
  };
}
