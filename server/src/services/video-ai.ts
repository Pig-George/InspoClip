import { db } from '../db/index.js';
import { config as configTable } from '../db/schema.js';
import { loadModelConfig, type ModelConfig } from '../ai/config.js';
import { createLangChainProvider } from '../ai/langchain-provider.js';
import { AiService } from '../ai/service.js';

export async function getVideoModelConfig(): Promise<ModelConfig> {
  const rows = await db.select().from(configTable);
  const values = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  return loadModelConfig({
    AI_PROVIDER: values.VIDEO_AI_PROVIDER || process.env.VIDEO_AI_PROVIDER,
    AI_API_KEY: values.VIDEO_AI_API_KEY || process.env.VIDEO_AI_API_KEY,
    AI_API_BASE: values.VIDEO_AI_API_BASE || process.env.VIDEO_AI_API_BASE,
    AI_MODEL: values.VIDEO_AI_MODEL || process.env.VIDEO_AI_MODEL,
    AI_VIDEO_FPS: values.VIDEO_AI_FPS || process.env.VIDEO_AI_FPS,
  });
}

export async function createVideoAiService(): Promise<AiService> {
  const config = await getVideoModelConfig();
  return new AiService(createLangChainProvider(config));
}
