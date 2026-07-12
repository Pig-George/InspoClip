import { describe, expect, it } from 'vitest';

import { getModelVideoBaseUrls, modelVideoAccessPath } from './public-url.js';

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
});
