import { RuntimeFailure } from "../errors"

export type LocalModelProvider = "qwen" | "openai" | "openrouter" | "openai-compatible"

export type LocalModelSettings = {
  provider: LocalModelProvider
  endpoint: string
  model: string
  apiKey: string
  videoFrameCount?: number
}

export const LOCAL_MODEL_SETTINGS_KEY = "modelSettings"

export const DEFAULT_LOCAL_MODEL_SETTINGS: LocalModelSettings = {
  provider: "qwen",
  endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  model: "qwen3.7-plus",
  apiKey: "",
  videoFrameCount: 16
}

type StorageAreaLike = {
  get(keys: string[]): Promise<Record<string, unknown>>
  set(values: Record<string, unknown>): Promise<void>
}

function defaultStorage(): StorageAreaLike {
  return chrome.storage.local as unknown as StorageAreaLike
}

export async function loadLocalModelSettings(storage: StorageAreaLike = defaultStorage()): Promise<LocalModelSettings> {
  const result = await storage.get([LOCAL_MODEL_SETTINGS_KEY])
  const value = result[LOCAL_MODEL_SETTINGS_KEY]
  const settings = value && typeof value === "object" ? value as Partial<LocalModelSettings> : {}
  return {
    ...DEFAULT_LOCAL_MODEL_SETTINGS,
    provider: normalizeLocalModelProvider(settings.provider),
    endpoint: typeof settings.endpoint === "string" ? settings.endpoint : DEFAULT_LOCAL_MODEL_SETTINGS.endpoint,
    model: typeof settings.model === "string" ? settings.model : DEFAULT_LOCAL_MODEL_SETTINGS.model,
    apiKey: typeof settings.apiKey === "string" ? settings.apiKey : "",
    videoFrameCount: normalizeVideoFrameCount(settings.videoFrameCount)
  }
}

export async function saveLocalModelSettings(settings: LocalModelSettings, storage: StorageAreaLike = defaultStorage()): Promise<void> {
  await storage.set({ [LOCAL_MODEL_SETTINGS_KEY]: settings })
}

export function validateLocalModelSettings(settings: LocalModelSettings): LocalModelSettings {
  if (!settings.apiKey.trim()) {
    throw new RuntimeFailure({
      code: "MODEL_CONFIGURATION_REQUIRED",
      message: "AI API key must be configured before analyzing assets",
      retryable: false,
      action: "open-settings"
    })
  }
  if (!settings.model.trim()) {
    throw new RuntimeFailure({
      code: "MODEL_CONFIGURATION_REQUIRED",
      message: "AI model name must be configured before analyzing assets",
      retryable: false,
      action: "open-settings"
    })
  }
  let endpoint: URL
  try {
    endpoint = new URL(settings.endpoint.trim())
  } catch {
    throw invalidEndpoint()
  }
  const isLocalHttp = endpoint.protocol === "http:" && ["localhost", "127.0.0.1", "::1"].includes(endpoint.hostname)
  if (endpoint.protocol !== "https:" && !isLocalHttp) throw invalidEndpoint()
  return {
    provider: normalizeLocalModelProvider(settings.provider),
    endpoint: endpoint.toString().replace(/\/$/, ""),
    model: settings.model.trim(),
    apiKey: settings.apiKey.trim(),
    videoFrameCount: normalizeVideoFrameCount(settings.videoFrameCount)
  }
}

function normalizeVideoFrameCount(value: unknown): number {
  const number = Number(value)
  return Math.min(48, Math.max(4, Number.isFinite(number) ? Math.round(number) : 16))
}

function normalizeLocalModelProvider(value: unknown): LocalModelProvider {
  if (value === "openai" || value === "openrouter" || value === "openai-compatible") return value
  return "qwen"
}

function invalidEndpoint(): RuntimeFailure {
  return new RuntimeFailure({
    code: "MODEL_CONFIGURATION_REQUIRED",
    message: "AI endpoint must use HTTPS, or HTTP on localhost",
    retryable: false,
    action: "open-settings"
  })
}
