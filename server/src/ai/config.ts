export type ModelProviderName =
  | 'alibaba-bailian'
  | 'openai'
  | 'openrouter'
  | 'google-ai-studio'
  | 'openai-compatible';

export interface ModelProviderProfile {
  label: string;
  baseURL: string;
  model: string;
}

export interface ModelConfig {
  provider: ModelProviderName;
  apiKey: string;
  baseURL: string;
  model: string;
  fps: number;
}

const DEFAULT_FPS = 3;

const PROVIDER_PROFILES: Record<ModelProviderName, ModelProviderProfile> = {
  'alibaba-bailian': {
    label: 'Alibaba Cloud Model Studio',
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen3.7-plus',
  },
  openai: {
    label: 'OpenAI',
    baseURL: 'https://api.openai.com/v1',
    model: 'gpt-4.1-mini',
  },
  openrouter: {
    label: 'OpenRouter',
    baseURL: 'https://openrouter.ai/api/v1',
    model: 'google/gemini-2.5-flash',
  },
  'google-ai-studio': {
    label: 'Google AI Studio',
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    model: 'gemini-2.5-flash',
  },
  'openai-compatible': {
    label: 'Other OpenAI-compatible service',
    baseURL: 'https://api.openai.com/v1',
    model: 'gpt-4.1-mini',
  },
};

const LEGACY_PROVIDER_ALIASES: Record<string, ModelProviderName> = {
  qwen: 'alibaba-bailian',
  dashscope: 'alibaba-bailian',
  gemini: 'google-ai-studio',
};

export function normalizeModelProviderName(value: string | undefined): ModelProviderName {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return 'alibaba-bailian';
  if (normalized in PROVIDER_PROFILES) return normalized as ModelProviderName;
  if (normalized in LEGACY_PROVIDER_ALIASES) return LEGACY_PROVIDER_ALIASES[normalized];
  throw new Error(`Unsupported AI provider: ${value}`);
}

export function getModelProviderProfile(provider: ModelProviderName): ModelProviderProfile {
  return PROVIDER_PROFILES[provider];
}

export function loadModelConfig(env: Record<string, string | undefined>): ModelConfig {
  const fps = env.AI_VIDEO_FPS === undefined
    ? DEFAULT_FPS
    : Number(env.AI_VIDEO_FPS);
  if (!isValidFps(fps)) {
    throw new Error('AI video FPS must be an integer between 1 and 5');
  }

  const provider = normalizeModelProviderName(env.AI_PROVIDER);
  const profile = getModelProviderProfile(provider);
  return {
    provider,
    // Loading remains usable by settings UIs before a key is configured.
    // validateModelConfig is the fail-fast boundary before model construction.
    apiKey: env.AI_API_KEY?.trim() || '',
    baseURL: env.AI_API_BASE?.trim() || profile.baseURL,
    model: env.AI_MODEL?.trim() || profile.model,
    fps,
  };
}

export function validateModelConfig(config: ModelConfig): ModelConfig {
  const provider = normalizeModelProviderName(config.provider);
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
    provider,
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
