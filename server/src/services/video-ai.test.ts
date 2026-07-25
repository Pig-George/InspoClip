import { describe, expect, it } from 'vitest';

import { resolveVideoModelConfig } from './video-ai.js';

describe('resolveVideoModelConfig', () => {
  it('uses only VIDEO_AI settings when image and video settings both exist', () => {
    expect(resolveVideoModelConfig({
      AI_PROVIDER: 'openai',
      AI_API_KEY: 'image-key',
      AI_API_BASE: 'https://images.example.test/v1',
      AI_MODEL: 'image-model',
      VIDEO_AI_PROVIDER: 'openai-compatible',
      VIDEO_AI_API_KEY: 'video-key',
      VIDEO_AI_API_BASE: 'https://videos.example.test/v1',
      VIDEO_AI_MODEL: 'video-model',
      VIDEO_AI_FPS: '4',
    }, {})).toEqual({
      provider: 'openai-compatible',
      apiKey: 'video-key',
      baseURL: 'https://videos.example.test/v1',
      model: 'video-model',
      fps: 4,
    });
  });

  it('never falls back to the image key when the video key is missing', () => {
    expect(resolveVideoModelConfig({ AI_API_KEY: 'image-key' }, {}).apiKey).toBe('');
  });
});
