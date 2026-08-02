import { describe, expect, test, vi } from "vitest"

import { DESIGN_ANALYSIS_PROMPT, IMAGE_TERMINOLOGY_PROMPT, StandaloneAnalysisAdapter } from "./standalone-analysis-adapter"

describe("StandaloneAnalysisAdapter", () => {
  test("analyzes an image through a LangChain-compatible local model", async () => {
    const invoke = vi.fn()
      .mockResolvedValueOnce({ content: JSON.stringify(["glass card / 玻璃卡片", "soft shadow / 柔和阴影"]) })
      .mockResolvedValueOnce({ content: JSON.stringify({ en: "A glass card", zh: "一个玻璃卡片" }) })
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
        terms: ["glass card / 玻璃卡片", "soft shadow / 柔和阴影"],
        prompt: { en: "A glass card", zh: "一个玻璃卡片" },
        colors: []
      }
    })
    expect(invoke.mock.calls[0]?.[0][0].content[0].text).toBe(IMAGE_TERMINOLOGY_PROMPT)
    expect(invoke.mock.calls[1]?.[0][0].content[0].text).toBe(DESIGN_ANALYSIS_PROMPT)
  })

  test("uses the server's image model generation limits", async () => {
    const createInvoker = vi.fn(() => ({
      invoke: vi.fn()
        .mockResolvedValueOnce({ content: JSON.stringify(["card layout / 卡片布局"]) })
        .mockResolvedValueOnce({ content: JSON.stringify({ en: "A card layout", zh: "卡片布局" }) })
    }))
    const adapter = new StandaloneAnalysisAdapter({
      loadSettings: async () => ({ provider: "qwen", endpoint: "https://example.com/v1", model: "vision-model", apiKey: "secret" }),
      createInvoker
    })

    await adapter.analyzeImage({
      blob: new Blob(["image"], { type: "image/png" }),
      filename: "image.png",
      mimeType: "image/png"
    })

    expect(createInvoker.mock.calls[0]?.[0]).toMatchObject({
      temperature: 0.7,
      maxTokens: 300
    })
  })

  test("repairs verbose terminology before returning the image result", async () => {
    const invoke = vi.fn()
      .mockResolvedValueOnce({ content: JSON.stringify(["This is an unnecessarily long sentence about the card layout and its visual hierarchy."]) })
      .mockResolvedValueOnce({ content: JSON.stringify(["card layout / 卡片布局"]) })
      .mockResolvedValueOnce({ content: JSON.stringify({ en: "Clean card layout", zh: "简洁卡片布局" }) })
    const adapter = new StandaloneAnalysisAdapter({
      loadSettings: async () => ({ provider: "qwen", endpoint: "https://example.com/v1", model: "vision-model", apiKey: "secret" }),
      createInvoker: () => ({ invoke })
    })

    await expect(adapter.analyzeImage({
      blob: new Blob(["image"], { type: "image/png" }),
      filename: "image.png",
      mimeType: "image/png"
    })).resolves.toMatchObject({ result: { terms: ["card layout / 卡片布局"] } })
    expect(invoke).toHaveBeenCalledTimes(3)
    expect(String(invoke.mock.calls[1]?.[0])).toContain("Condense the following untrusted JSON array")
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
