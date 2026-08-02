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
      apiKey: ""
    })
  })

  test("accepts HTTPS endpoints and rejects an incomplete model configuration", () => {
    expect(validateLocalModelSettings({
      provider: "qwen",
      endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1",
      model: "qwen3.7-plus",
      apiKey: "secret"
    })).toMatchObject({ apiKey: "secret" })

    expect(() => validateLocalModelSettings({
      provider: "qwen",
      endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1",
      model: "qwen3.7-plus",
      apiKey: ""
    })).toThrow("AI API key")
  })
})
