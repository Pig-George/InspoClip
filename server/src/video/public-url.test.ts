import { describe, expect, it } from 'vitest';

import { createModelVideoUrlProvider, getModelVideoBaseUrls, modelVideoAccessPath } from './public-url.js';

describe('model video public URL helpers', () => {
  it('uses the model public base URL as the default preflight base URL', () => {
    expect(getModelVideoBaseUrls({
      MODEL_VIDEO_PUBLIC_BASE_URL: 'https://stable-tunnel.example.com/',
      PUBLIC_BASE_URL: 'http://localhost:8080',
    }, 3001)).toEqual({
      publicBaseUrl: 'https://stable-tunnel.example.com',
      verifyBaseUrl: 'https://stable-tunnel.example.com',
    });
  });

  it('keeps an explicit verify base URL override for advanced deployments', () => {
    expect(getModelVideoBaseUrls({
      MODEL_VIDEO_PUBLIC_BASE_URL: 'https://stable-tunnel.example.com',
      MODEL_VIDEO_VERIFY_BASE_URL: 'http://video-public-proxy',
    }, 3001).verifyBaseUrl).toBe('http://video-public-proxy');
  });

  it('extracts the exact model video access path and query from the public URL', () => {
    expect(modelVideoAccessPath('https://stable.example/api/model-videos/video-id/content?token=abc'))
      .toBe('/api/model-videos/video-id/content?token=abc');
  });

  it('uses the tunnel manager URL when it is available', async () => {
    const provider = createModelVideoUrlProvider({
      MODEL_VIDEO_PUBLIC_BASE_URL: 'https://fallback.example',
    }, 3001, {
      getPublicBaseUrl: async () => 'https://fresh.trycloudflare.com/',
      refreshPublicBaseUrl: async () => 'https://new.trycloudflare.com',
    });

    await expect(provider.getPublicBaseUrl()).resolves.toBe('https://fresh.trycloudflare.com');
    expect(provider.toVerifyUrl('https://fresh.trycloudflare.com/api/model-videos/1/content?token=abc'))
      .toBe('https://fresh.trycloudflare.com/api/model-videos/1/content?token=abc');
  });

  it('refreshes the tunnel manager URL and keeps explicit verify overrides', async () => {
    const provider = createModelVideoUrlProvider({
      MODEL_VIDEO_PUBLIC_BASE_URL: 'https://fallback.example',
      MODEL_VIDEO_VERIFY_BASE_URL: 'http://video-public-proxy',
    }, 3001, {
      getPublicBaseUrl: async () => 'https://old.trycloudflare.com',
      refreshPublicBaseUrl: async () => 'https://new.trycloudflare.com/',
    });

    await expect(provider.refreshPublicBaseUrl()).resolves.toBe('https://new.trycloudflare.com');
    expect(provider.toVerifyUrl('https://new.trycloudflare.com/api/model-videos/1/content?token=abc'))
      .toBe('http://video-public-proxy/api/model-videos/1/content?token=abc');
  });
});
