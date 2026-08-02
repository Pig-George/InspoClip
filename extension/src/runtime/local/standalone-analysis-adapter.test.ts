import { describe, expect, test } from "vitest"

import { StandaloneAnalysisAdapter } from "./standalone-analysis-adapter"

describe("StandaloneAnalysisAdapter", () => {
  test("analyzes an image through a LangChain-compatible local model", async () => {
    const invoke = async () => ({
      content: JSON.stringify({
        terms: ["glass card", "soft shadow"],
        prompt: { en: "A glass card", zh: "一个玻璃卡片" }
      })
    })
    const adapter = new StandaloneAnalysisAdapter({
      loadSettings: async () => ({ provider: "qwen", endpoint: "https://example.com/v1", model: "vision-model", apiKey: "secret" }),
      createInvoker: () => ({ invoke }),
      createId: () => "job-1",
      now: () => "2026-08-02T00:00:00.000Z"
    })

    await expect(adapter.analyzeImage({
      blob: new Blob(["image"], { type: "image/png" }),
      filename: "image.png",
      mimeType: "image/png"
    })).resolves.toMatchObject({
      id: "job-1",
      status: "completed",
      mode: "standalone",
      result: {
        terms: ["glass card", "soft shadow"],
        prompt: { en: "A glass card", zh: "一个玻璃卡片" },
        colors: []
      }
    })
  })

  test("does not fall back to the backend when local model settings are incomplete", async () => {
    const adapter = new StandaloneAnalysisAdapter({
      loadSettings: async () => ({ provider: "qwen", endpoint: "https://example.com/v1", model: "vision-model", apiKey: "" })
    })

    await expect(adapter.analyzeImage({
      blob: new Blob(["image"]),
      filename: "image.png",
      mimeType: "image/png"
    })).rejects.toMatchObject({
      detail: {
        code: "MODEL_CONFIGURATION_REQUIRED",
        retryable: false,
        action: "open-settings"
      }
    })
  })
})
