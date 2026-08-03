import { describe, expect, it, vi } from 'vitest';

import type { ModelProvider } from '../ai/provider.js';
import {
  createImageProvider,
  resolveImageModelConfig,
  type ImageProviderFactory,
} from './ai.js';

const provider: ModelProvider = {
  analyzeImage: vi.fn(),
  analyzeVideo: vi.fn(),
  generateText: vi.fn(),
};

describe('image AI service wiring', () => {
  it('normalizes legacy Gemini configuration into the Google AI Studio profile', () => {
    expect(resolveImageModelConfig({ AI_PROVIDER: 'gemini', AI_API_KEY: 'key' }, {}))
      .toMatchObject({
        provider: 'google-ai-studio',
        baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
      });
  });

  it('uses only image settings and ignores all VIDEO_AI settings', () => {
    expect(resolveImageModelConfig({
      AI_PROVIDER: 'openrouter',
      AI_API_KEY: 'image-key',
      AI_API_BASE: 'https://images.example.test/v1',
      AI_MODEL: 'image-model',
      VIDEO_AI_PROVIDER: 'alibaba-bailian',
      VIDEO_AI_API_KEY: 'video-key',
    }, {})).toMatchObject({
      provider: 'openrouter',
      apiKey: 'image-key',
      baseURL: 'https://images.example.test/v1',
      model: 'image-model',
    });
  });

  it('uses the unified LangChain factory for image analysis', () => {
    const factory: ImageProviderFactory = { create: vi.fn(() => provider) };
    const config = resolveImageModelConfig({ AI_PROVIDER: 'openai', AI_API_KEY: 'key' }, {});

    expect(createImageProvider(config, factory)).toBe(provider);
    expect(factory.create).toHaveBeenCalledWith(config);
  });
});
