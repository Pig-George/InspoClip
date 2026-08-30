import { describe, expect, test } from "vitest"

import { loadLocalModelSettings, validateLocalModelSettings } from "./model-settings"

function storage(values: Record<string, unknown> = {}) {
  return {
    get: async () => values,
    set: async () => undefined
  }
}

describe("local model settings", () => {
  test("loads the standalone Qwen defaults without persisting a key", async () => {
    await expect(loadLocalModelSettings(storage())).resolves.toMatchObject({
      provider: "qwen",
      model: "qwen3.7-plus",
      videoFrameCount: 16,
      apiKey: ""
    })
  })

  test("accepts HTTPS endpoints and rejects an incomplete model configuration", () => {
    expect(validateLocalModelSettings({
      provider: "qwen",
      endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1",
      model: "qwen3.7-plus",
      videoFrameCount: 16,
      apiKey: "secret"
    })).toMatchObject({ apiKey: "secret" })

    expect(() => validateLocalModelSettings({
      provider: "qwen",
      endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1",
      model: "qwen3.7-plus",
      videoFrameCount: 16,
      apiKey: ""
    })).toThrow("AI API key")
  })

  test("preserves named OpenAI-compatible service platforms", () => {
    expect(validateLocalModelSettings({
      provider: "openrouter",
      endpoint: "https://openrouter.ai/api/v1",
      model: "openai/gpt-4.1-mini",
      videoFrameCount: 24,
      apiKey: "secret"
    })).toMatchObject({ provider: "openrouter" })
  })

  test("normalizes the configurable video frame count", async () => {
    await expect(loadLocalModelSettings(storage({ modelSettings: { videoFrameCount: 100 } })))
      .resolves.toMatchObject({ videoFrameCount: 48 })
    await expect(loadLocalModelSettings(storage({ modelSettings: { videoFrameCount: 1 } })))
      .resolves.toMatchObject({ videoFrameCount: 4 })
  })
})
