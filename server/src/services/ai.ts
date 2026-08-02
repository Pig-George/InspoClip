import { db } from '../db/index.js';
import { config as configTable } from '../db/schema.js';
import { createLangChainProvider } from '../ai/langchain-provider.js';
import {
  createAnthropicImageProvider,
  createGeminiImageProvider,
} from '../ai/native-image-providers.js';
import type { ModelProvider } from '../ai/provider.js';
import { AiService } from '../ai/service.js';
import { IMAGE_ANALYSIS_TIMEOUT_MS, withRequestTimeout } from '../ai/request-timeout.js';

export interface LegacyAiConfig {
  provider: string;
  apiKey: string;
  baseURL: string;
  model: string;
}

async function getConfig(): Promise<LegacyAiConfig> {
  let values: Record<string, string> = {};
  try {
    const rows = await db.select().from(configTable);
    values = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  } catch {
    // Environment values remain available while the database is unavailable.
  }

  return resolveLegacyAiConfig(values, process.env);
}

export function resolveLegacyAiConfig(
  values: Record<string, string | undefined>,
  env: Record<string, string | undefined>,
): LegacyAiConfig {
  const provider = values.AI_PROVIDER || env.AI_PROVIDER || 'openai';
  return {
    provider,
    apiKey: values.AI_API_KEY || env.AI_API_KEY || '',
    baseURL:
      values.AI_API_BASE
      || env.AI_API_BASE
      || defaultBaseUrl(provider),
    model: values.AI_MODEL || env.AI_MODEL || 'gpt-5.4',
  };
}

function defaultBaseUrl(provider: string): string {
  if (provider === 'gemini') {
    return 'https://generativelanguage.googleapis.com/v1beta/openai/';
  }
  if (provider === 'anthropic') return 'https://api.anthropic.com/v1';
  return 'https://api.openai.com/v1';
}

async function createService(): Promise<AiService> {
  const config = await getConfig();
  return new AiService(createLegacyImageProvider(config));
}

export interface LegacyProviderFactories {
  openAICompatible(config: LegacyAiConfig): ModelProvider;
  gemini(config: LegacyAiConfig): ModelProvider;
  anthropic(config: LegacyAiConfig): ModelProvider;
}

const defaultProviderFactories: LegacyProviderFactories = {
  openAICompatible: (config) => createLangChainProvider({
    provider: 'openai-compatible',
    apiKey: config.apiKey,
    baseURL: config.baseURL,
    model: config.model,
    fps: 3,
  }),
  gemini: createGeminiImageProvider,
  anthropic: createAnthropicImageProvider,
};

export function createLegacyImageProvider(
  config: LegacyAiConfig,
  factories: LegacyProviderFactories = defaultProviderFactories,
): ModelProvider {
  if (config.provider === 'gemini') {
    return factories.gemini(config);
  }
  if (config.provider === 'anthropic') {
    return factories.anthropic(config);
  }
  return factories.openAICompatible(config);
}

export async function generateTerms(imagePath: string): Promise<string[]> {
  return withRequestTimeout(
    (await createService()).generateTerms(imagePath),
    IMAGE_ANALYSIS_TIMEOUT_MS,
  );
}

export async function generateDesignPrompt(
  imagePath: string,
): Promise<{ en: string; zh: string }> {
  return withRequestTimeout(
    (await createService()).generateDesignPrompt(imagePath),
    IMAGE_ANALYSIS_TIMEOUT_MS,
  );
}
