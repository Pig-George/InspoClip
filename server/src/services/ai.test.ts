import { describe, expect, it, vi } from 'vitest';

import type { ModelProvider } from '../ai/provider.js';
import {
  createLegacyImageProvider,
  resolveLegacyAiConfig,
  type LegacyProviderFactories,
} from './ai.js';

const provider: ModelProvider = {
  analyzeImage: vi.fn(),
  analyzeVideo: vi.fn(),
  generateText: vi.fn(),
};

function factories() {
  return {
    openAICompatible: vi.fn(() => provider),
    gemini: vi.fn(() => provider),
    anthropic: vi.fn(() => provider),
  } satisfies LegacyProviderFactories;
}

describe('legacy AI facade wiring', () => {
  it.each(['openai', 'openai-compatible'])('selects LangChain for %s', (providerName) => {
    const providerFactories = factories();
    const config = resolveLegacyAiConfig({ AI_PROVIDER: providerName, AI_API_KEY: 'key' }, {});

    expect(createLegacyImageProvider(config, providerFactories)).toBe(provider);
    expect(providerFactories.openAICompatible).toHaveBeenCalledOnce();
    expect(providerFactories.gemini).not.toHaveBeenCalled();
    expect(providerFactories.anthropic).not.toHaveBeenCalled();
  });

  it('selects the native Gemini provider', () => {
    const providerFactories = factories();
    const config = resolveLegacyAiConfig({ AI_PROVIDER: 'gemini', AI_API_KEY: 'key' }, {});

    createLegacyImageProvider(config, providerFactories);

    expect(providerFactories.gemini).toHaveBeenCalledOnce();
    expect(providerFactories.openAICompatible).not.toHaveBeenCalled();
  });

  it('selects the native Anthropic provider', () => {
    const providerFactories = factories();
    const config = resolveLegacyAiConfig({ AI_PROVIDER: 'anthropic', AI_API_KEY: 'key' }, {});

    createLegacyImageProvider(config, providerFactories);

    expect(providerFactories.anthropic).toHaveBeenCalledOnce();
    expect(providerFactories.openAICompatible).not.toHaveBeenCalled();
  });

  it('resolves legacy defaults without reading the database', () => {
    expect(resolveLegacyAiConfig({}, {})).toEqual({
      provider: 'openai',
      apiKey: '',
      baseURL: 'https://api.openai.com/v1',
      model: 'gpt-5.4',
    });
    expect(resolveLegacyAiConfig({ AI_PROVIDER: 'anthropic' }, {}).baseURL)
      .toBe('https://api.anthropic.com/v1');
  });

  it('allows module import without a key but fails when constructing a real provider', async () => {
    await expect(import('./ai.js')).resolves.toBeDefined();
    const config = resolveLegacyAiConfig({}, {});

    expect(() => createLegacyImageProvider(config)).toThrow('API key');
  });
});
