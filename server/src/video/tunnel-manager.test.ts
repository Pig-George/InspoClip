import { describe, expect, it } from 'vitest';

import { createTunnelManagerClient } from './tunnel-manager.js';

describe('tunnel manager client', () => {
  it('loads the current public base URL from the manager', async () => {
    const calls: string[] = [];
    const client = createTunnelManagerClient({
      TUNNEL_MANAGER_URL: 'http://tunnel-manager:3002/',
    }, async (input) => {
      calls.push(String(input));
      return new Response(JSON.stringify({ publicBaseUrl: 'https://fresh.trycloudflare.com/' }), { status: 200 });
    });

    await expect(client?.getPublicBaseUrl()).resolves.toBe('https://fresh.trycloudflare.com');
    expect(calls).toEqual(['http://tunnel-manager:3002/url']);
  });

  it('requests a tunnel refresh and returns the refreshed public base URL', async () => {
    const requests: Array<{ url: string; method?: string }> = [];
    const client = createTunnelManagerClient({
      TUNNEL_MANAGER_URL: 'http://tunnel-manager:3002',
    }, async (input, init) => {
      requests.push({ url: String(input), method: init?.method });
      return new Response(JSON.stringify({ publicBaseUrl: 'https://new.trycloudflare.com' }), { status: 200 });
    });

    await expect(client?.refreshPublicBaseUrl()).resolves.toBe('https://new.trycloudflare.com');
    expect(requests).toEqual([{ url: 'http://tunnel-manager:3002/refresh', method: 'POST' }]);
  });
});
