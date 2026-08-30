import { db } from '../db/index.js';
import { config as configTable } from '../db/schema.js';
import { loadModelConfig, type ModelConfig } from '../ai/config.js';
import { createLangChainProvider } from '../ai/langchain-provider.js';
import type { ModelProvider } from '../ai/provider.js';
import { AiService } from '../ai/service.js';
import { IMAGE_ANALYSIS_TIMEOUT_MS, withRequestTimeout } from '../ai/request-timeout.js';

async function getConfig(): Promise<ModelConfig> {
  let values: Record<string, string> = {};
  try {
    const rows = await db.select().from(configTable);
    values = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  } catch {
    // Environment values remain available while the database is unavailable.
  }
  return resolveImageModelConfig(values, process.env);
}

export function resolveImageModelConfig(
  values: Record<string, string | undefined>,
  env: Record<string, string | undefined>,
): ModelConfig {
  return loadModelConfig({
    AI_PROVIDER: values.AI_PROVIDER || env.AI_PROVIDER,
    AI_API_KEY: values.AI_API_KEY || env.AI_API_KEY,
    AI_API_BASE: values.AI_API_BASE || env.AI_API_BASE,
    AI_MODEL: values.AI_MODEL || env.AI_MODEL,
  });
}

export interface ImageProviderFactory {
  create(config: ModelConfig): ModelProvider;
}

const defaultProviderFactory: ImageProviderFactory = {
  create: createLangChainProvider,
};

export function createImageProvider(
  config: ModelConfig,
  factory: ImageProviderFactory = defaultProviderFactory,
): ModelProvider {
  return factory.create(config);
}

async function createService(): Promise<AiService> {
  return new AiService(createImageProvider(await getConfig()));
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
