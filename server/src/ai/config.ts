export type ModelProviderName = 'openai-compatible';

export interface ModelConfig {
  provider: ModelProviderName;
  apiKey: string;
  baseURL: string;
  model: string;
  fps: number;
}

const DEFAULT_FPS = 3;
const SUPPORTED_PROVIDERS = new Set<ModelProviderName>(['openai-compatible']);

export function loadModelConfig(env: Record<string, string | undefined>): ModelConfig {
  const fps = env.AI_VIDEO_FPS === undefined
    ? DEFAULT_FPS
    : Number(env.AI_VIDEO_FPS);
  if (!isValidFps(fps)) {
    throw new Error('AI video FPS must be an integer between 1 and 5');
  }

  const provider = (env.AI_PROVIDER?.trim() || 'openai-compatible') as ModelProviderName;
  if (!SUPPORTED_PROVIDERS.has(provider)) {
    throw new Error(`Unsupported AI provider: ${provider}`);
  }

  return {
    provider,
    // Loading remains usable by settings UIs before a key is configured.
    // validateModelConfig is the fail-fast boundary before model construction.
    apiKey: env.AI_API_KEY?.trim() || '',
    baseURL: env.AI_API_BASE?.trim() || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: env.AI_MODEL?.trim() || 'qwen3.7-plus',
    fps,
  };
}

export function validateModelConfig(config: ModelConfig): ModelConfig {
  if (!SUPPORTED_PROVIDERS.has(config.provider)) {
    throw new Error(`Unsupported AI provider: ${config.provider}`);
  }
  if (!config.apiKey.trim()) throw new Error('AI API key must not be empty');
  if (!config.model.trim()) throw new Error('AI model must not be empty');
  if (!isValidFps(config.fps)) {
    throw new Error('AI video FPS must be an integer between 1 and 5');
  }

  let endpoint: URL;
  try {
    endpoint = new URL(config.baseURL.trim());
  } catch {
    throw new Error('AI base URL must be a valid HTTP(S) URL');
  }
  if (endpoint.protocol !== 'http:' && endpoint.protocol !== 'https:') {
    throw new Error('AI base URL must be a valid HTTP(S) URL');
  }

  return {
    ...config,
    apiKey: config.apiKey.trim(),
    baseURL: config.baseURL.trim(),
    model: config.model.trim(),
  };
}

function isValidFps(fps: number): boolean {
  return Number.isInteger(fps) && fps >= 1 && fps <= 5;
}

export function maskApiKey(apiKey: string): string {
  if (!apiKey) return '';
  if (apiKey.length <= 8) return '*'.repeat(apiKey.length);

  const visibleLength = 4;
  return `${apiKey.slice(0, visibleLength)}${'*'.repeat(apiKey.length - visibleLength * 2)}${apiKey.slice(-visibleLength)}`;
}

export function isMaskedApiKey(apiKey: string): boolean {
  return /[*•]/.test(apiKey);
}
