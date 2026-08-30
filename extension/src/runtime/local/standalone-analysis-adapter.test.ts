import { describe, expect, test, vi } from "vitest"

import {
  DESIGN_ANALYSIS_PROMPT,
  IMAGE_TERMINOLOGY_PROMPT,
  QWEN_JSON_RESPONSE_FORMAT,
  QWEN_THINKING_MODEL_KWARGS,
  StandaloneAnalysisAdapter,
  getVideoFrameRequestType
} from "./standalone-analysis-adapter"

describe("StandaloneAnalysisAdapter", () => {
  test("uses a direct offscreen message from the background context", () => {
    expect(getVideoFrameRequestType(true)).toBe("EXTRACT_OFFSCREEN_VIDEO_FRAMES")
    expect(getVideoFrameRequestType(false)).toBe("REQUEST_STANDALONE_VIDEO_FRAMES")
  })

  test("uses the DashScope JSON Mode response format for Qwen design prompts", () => {
    expect(QWEN_JSON_RESPONSE_FORMAT).toEqual({ type: "json_object" })
    expect(QWEN_THINKING_MODEL_KWARGS).toEqual({ enable_thinking: true })
  })

  test("analyzes an image through a LangChain-compatible local model", async () => {
    const invoke = vi.fn()
      .mockResolvedValueOnce({ content: JSON.stringify(["glass card / 玻璃卡片", "soft shadow / 柔和阴影"]) })
      .mockResolvedValueOnce({ content: JSON.stringify({ en: "A glass card", zh: "一个玻璃卡片" }) })
    const extractColors = vi.fn().mockResolvedValue(["#3377cc", "#f0b43c"])
    const adapter = new StandaloneAnalysisAdapter({
      loadSettings: async () => ({ provider: "qwen", endpoint: "https://example.com/v1", model: "vision-model", apiKey: "secret" }),
      createInvoker: () => ({ invoke }),
      extractColors,
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
        colors: ["#3377cc", "#f0b43c"]
      }
    })
    expect(extractColors).toHaveBeenCalledWith(expect.objectContaining({ filename: "image.png", mimeType: "image/png" }))
    expect(invoke.mock.calls[0]?.[0][0].content[0].text).toBe(IMAGE_TERMINOLOGY_PROMPT)
    expect(invoke.mock.calls[1]?.[0][0].content[0].text).toBe(DESIGN_ANALYSIS_PROMPT)
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

  test("uses LangChain structured output for the bilingual design prompt", async () => {
    const invoke = vi.fn().mockResolvedValue({ content: JSON.stringify(["glass card / 玻璃卡片"]) })
    const invokeDesignPrompt = vi.fn().mockResolvedValue({
      en: "A translucent glass card interface",
      zh: "半透明玻璃卡片界面"
    })
    const adapter = new StandaloneAnalysisAdapter({
      loadSettings: async () => ({ provider: "qwen", endpoint: "https://example.com/v1", model: "vision-model", apiKey: "secret" }),
      createInvoker: () => ({ invoke, invokeDesignPrompt })
    })

    await expect(adapter.analyzeImage({
      blob: new Blob(["image"], { type: "image/png" }),
      filename: "image.png",
      mimeType: "image/png"
    })).resolves.toMatchObject({
      result: {
        prompt: {
          en: "A translucent glass card interface",
          zh: "半透明玻璃卡片界面"
        }
      }
    })

    expect(invoke).toHaveBeenCalledTimes(1)
    expect(invokeDesignPrompt).toHaveBeenCalledTimes(1)
    expect(invokeDesignPrompt.mock.calls[0]?.[0][0].content[0].text).toBe(DESIGN_ANALYSIS_PROMPT)
  })

  test("collects a streamed Qwen JSON prompt without applying the total request timeout", async () => {
    const invoke = vi.fn().mockResolvedValue({ content: JSON.stringify(["glass card / 玻璃卡片"]) })
    const streamDesignPrompt = vi.fn(async function* () {
      yield { content: '{"en":"A translucent ' }
      yield { content: 'glass card","zh":"半透明玻璃卡片"}' }
    })
    const adapter = new StandaloneAnalysisAdapter({
      loadSettings: async () => ({ provider: "qwen", endpoint: "https://example.com/v1", model: "vision-model", apiKey: "secret" }),
      createInvoker: () => ({ invoke, streamDesignPrompt }),
      requestTimeoutMs: 1
    })

    await expect(adapter.analyzeImage({
      blob: new Blob(["image"], { type: "image/png" }),
      filename: "image.png",
      mimeType: "image/png"
    })).resolves.toMatchObject({
      result: { prompt: { en: "A translucent glass card", zh: "半透明玻璃卡片" } }
    })

    expect(streamDesignPrompt).toHaveBeenCalledTimes(1)
    expect(invoke).toHaveBeenCalledTimes(1)
  })

  test("falls back to validated JSON when the structured response is incomplete", async () => {
    const invoke = vi.fn()
      .mockResolvedValueOnce({ content: JSON.stringify(["glass card / 玻璃卡片"]) })
      .mockResolvedValueOnce({ content: JSON.stringify({ en: "A translucent glass card", zh: "半透明玻璃卡片" }) })
    const invokeDesignPrompt = vi.fn().mockResolvedValue({ en: "" })
    const adapter = new StandaloneAnalysisAdapter({
      loadSettings: async () => ({ provider: "qwen", endpoint: "https://example.com/v1", model: "vision-model", apiKey: "secret" }),
      createInvoker: () => ({ invoke, invokeDesignPrompt })
    })

    await expect(adapter.analyzeImage({
      blob: new Blob(["image"], { type: "image/png" }),
      filename: "image.png",
      mimeType: "image/png"
    })).resolves.toMatchObject({
      result: {
        prompt: { en: "A translucent glass card", zh: "半透明玻璃卡片" }
      }
    })

    expect(invokeDesignPrompt).toHaveBeenCalledTimes(1)
    expect(invoke).toHaveBeenCalledTimes(2)
  })

  test("normalizes a bilingual prompt wrapped by the model response", async () => {
    const invoke = vi.fn()
      .mockResolvedValueOnce({ content: JSON.stringify(["glass card / 玻璃卡片"]) })
      .mockResolvedValueOnce({
        content: JSON.stringify({
          result: {
            prompt: { en: "A translucent glass card", zh: "半透明玻璃卡片" }
          }
        })
      })
    const adapter = new StandaloneAnalysisAdapter({
      loadSettings: async () => ({ provider: "qwen", endpoint: "https://example.com/v1", model: "vision-model", apiKey: "secret" }),
      createInvoker: () => ({ invoke })
    })

    await expect(adapter.analyzeImage({
      blob: new Blob(["image"], { type: "image/png" }),
      filename: "image.png",
      mimeType: "image/png"
    })).resolves.toMatchObject({
      result: {
        prompt: { en: "A translucent glass card", zh: "半透明玻璃卡片" }
      }
    })
  })

  test("reports malformed JSON instead of completing without a prompt", async () => {
    const invoke = vi.fn()
      .mockResolvedValueOnce({ content: JSON.stringify(["glass card / 玻璃卡片"]) })
      .mockResolvedValueOnce({ content: '{"en":"unfinished prompt"' })
    const adapter = new StandaloneAnalysisAdapter({
      loadSettings: async () => ({ provider: "qwen", endpoint: "https://example.com/v1", model: "vision-model", apiKey: "secret" }),
      createInvoker: () => ({ invoke })
    })

    await expect(adapter.analyzeImage({
      blob: new Blob(["image"], { type: "image/png" }),
      filename: "image.png",
      mimeType: "image/png"
    })).rejects.toMatchObject({
      detail: {
        code: "LOCAL_MODEL_INVALID_PROMPT",
        retryable: true,
        action: "retry"
      }
    })
  })

  test("fails a stalled local model request instead of leaving analysis pending", async () => {
    const adapter = new StandaloneAnalysisAdapter({
      loadSettings: async () => ({ provider: "qwen", endpoint: "https://example.com/v1", model: "vision-model", apiKey: "secret" }),
      createInvoker: () => ({ invoke: () => new Promise(() => undefined) }),
      requestTimeoutMs: 5
    })

    await expect(adapter.analyzeImage({
      blob: new Blob(["image"], { type: "image/png" }),
      filename: "image.png",
      mimeType: "image/png"
    })).rejects.toMatchObject({
      detail: {
        code: "LOCAL_MODEL_REQUEST_TIMEOUT",
        retryable: true,
        action: "retry"
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

  test("persists a standalone video job and stores its completed analysis on the draft asset", async () => {
    const analysis = {
      summary: { en: "Card expands", zh: "卡片展开" },
      visualStyle: { colors: ["#ffffff"], typography: "sans", layout: "centered", effects: ["scale"] },
      stages: [],
      assets: [],
      uncertainties: []
    }
    const storedJobs = new Map<string, any>()
    const storedAssets = new Map<string, any>()
    const assets = {
      createDraft: vi.fn(async (input) => {
        const asset = { id: "video-1", kind: "video", state: "draft", mode: "standalone", ...input, createdAt: "now", updatedAt: "now" }
        storedAssets.set(asset.id, asset)
        return asset
      }),
      get: vi.fn(async (id) => storedAssets.get(id) || null),
      update: vi.fn(async (id, patch) => {
        const asset = { ...storedAssets.get(id), ...patch }
        storedAssets.set(id, asset)
        return asset
      })
    }
    const jobs = {
      put: vi.fn(async (job) => { storedJobs.set(job.id, structuredClone(job)) }),
      get: vi.fn(async (id) => storedJobs.get(id) || null)
    }
    const analyzeVideoContent = vi.fn().mockResolvedValue(analysis)
    const adapter = new StandaloneAnalysisAdapter({
      loadSettings: async () => ({ provider: "qwen", endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1", model: "qwen-vl-plus", apiKey: "secret", videoFrameCount: 16 }),
      assets: assets as never,
      jobs: jobs as never,
      analyzeVideoContent,
      createId: () => "job-video-1",
      now: () => "2026-08-06T00:00:00.000Z"
    })

    const queued = await adapter.analyzeVideo({
      blob: new Blob(["video"], { type: "video/mp4" }),
      filename: "demo.mp4",
      mimeType: "video/mp4",
      durationMs: 10_250
    })

    expect(queued).toMatchObject({ id: "job-video-1", assetId: "video-1", status: "queued" })
    expect(assets.createDraft).toHaveBeenCalledWith(expect.objectContaining({ durationMs: 10_250 }))
    await vi.waitFor(async () => {
      await expect(adapter.getJob("job-video-1")).resolves.toMatchObject({
        status: "completed",
        progress: 100,
        result: { videoId: "video-1", jobId: "job-video-1", status: "completed" }
      })
    })
    expect(assets.update).toHaveBeenCalledWith("video-1", expect.objectContaining({ analysis }))
    expect(analyzeVideoContent).toHaveBeenCalledWith(expect.objectContaining({ durationMs: 10_250 }), expect.any(Object))
  })

  test("generates and caches a standalone video replication prompt", async () => {
    const invoke = vi.fn().mockResolvedValue({ content: JSON.stringify({ en: "Build an expanding card", zh: "构建展开卡片" }) })
    let asset: any = {
      id: "video-1",
      kind: "video",
      analysis: {
        summary: { en: "Card expands", zh: "卡片展开" },
        visualStyle: { colors: [], typography: "sans", layout: "centered", effects: [] },
        stages: [],
        assets: [],
        uncertainties: []
      }
    }
    const assets = {
      get: vi.fn(async () => asset),
      update: vi.fn(async (_id, patch) => { asset = { ...asset, ...patch }; return asset })
    }
    const adapter = new StandaloneAnalysisAdapter({
      loadSettings: async () => ({ provider: "openrouter", endpoint: "https://openrouter.ai/api/v1", model: "vision-model", apiKey: "secret", videoFrameCount: 16 }),
      createInvoker: () => ({ invoke }),
      assets: assets as never
    })

    await expect(adapter.generatePrompt({ assetId: "video-1", purpose: "frontend", target: "React", regenerate: true }))
      .resolves.toEqual({ assetId: "video-1", content: { en: "Build an expanding card", zh: "构建展开卡片" } })
    await expect(adapter.generatePrompt({ assetId: "video-1", purpose: "frontend", target: "React", regenerate: false }))
      .resolves.toEqual({ assetId: "video-1", content: { en: "Build an expanding card", zh: "构建展开卡片" } })
    expect(invoke).toHaveBeenCalledTimes(1)
    expect(String(invoke.mock.calls[0]?.[0]?.[0]?.content)).toContain("untrusted JSON data")
    expect(assets.update).toHaveBeenCalledWith("video-1", expect.objectContaining({
      analysis: expect.objectContaining({ replicationPrompts: expect.any(Object) })
    }))
  })

  test("uses the structured replication output invoker when available", async () => {
    const invoke = vi.fn().mockResolvedValue({ content: "legacy path should not be used" })
    const invokeReplicationPrompt = vi.fn().mockResolvedValue({
      en: "Animate the card with a spring transition",
      zh: "使用弹簧过渡动画卡片"
    })
    const assets = {
      get: vi.fn(async () => ({ id: "video-structured", kind: "video", analysis: { stages: [] } })),
      update: vi.fn(async (_id, patch) => patch)
    }
    const adapter = new StandaloneAnalysisAdapter({
      loadSettings: async () => ({ provider: "openrouter", endpoint: "https://openrouter.ai/api/v1", model: "vision-model", apiKey: "secret" }),
      createInvoker: () => ({ invoke, invokeReplicationPrompt }),
      assets: assets as never
    })

    await expect(adapter.generatePrompt({ assetId: "video-structured", purpose: "general", regenerate: true }))
      .resolves.toEqual({
        assetId: "video-structured",
        content: {
          en: "Animate the card with a spring transition",
          zh: "使用弹簧过渡动画卡片"
        }
      })

    expect(invokeReplicationPrompt).toHaveBeenCalledTimes(1)
    expect(invoke).not.toHaveBeenCalled()
    expect(invokeReplicationPrompt.mock.calls[0]?.[0]?.[0]?.content).toContain("Video analysis JSON")
  })

  test("repairs a structured-output parser failure once", async () => {
    const invokeReplicationPrompt = vi.fn()
      .mockRejectedValueOnce(new Error("Invalid JSON from structured output parser"))
      .mockResolvedValueOnce({ en: "Reveal the card smoothly", zh: "平滑地展开卡片" })
    const assets = {
      get: vi.fn(async () => ({ id: "video-structured-repair", kind: "video", analysis: { stages: [] } })),
      update: vi.fn(async (_id, patch) => patch)
    }
    const adapter = new StandaloneAnalysisAdapter({
      loadSettings: async () => ({ provider: "openrouter", endpoint: "https://openrouter.ai/api/v1", model: "vision-model", apiKey: "secret" }),
      createInvoker: () => ({ invoke: vi.fn(), invokeReplicationPrompt }),
      assets: assets as never
    })

    await expect(adapter.generatePrompt({ assetId: "video-structured-repair", purpose: "general", regenerate: true }))
      .resolves.toEqual({ assetId: "video-structured-repair", content: { en: "Reveal the card smoothly", zh: "平滑地展开卡片" } })

    expect(invokeReplicationPrompt).toHaveBeenCalledTimes(2)
    expect(String(invokeReplicationPrompt.mock.calls[1]?.[0]?.[0]?.content)).toContain("Your previous response was not parseable")
  })

  test("treats an omitted regenerate flag as a generation request", async () => {
    const invoke = vi.fn().mockResolvedValue({ content: JSON.stringify({ en: "Generate the interaction", zh: "生成交互效果" }) })
    const assets = {
      get: vi.fn(async () => ({ id: "video-default", kind: "video", analysis: { stages: [] } })),
      update: vi.fn(async (_id, patch) => patch)
    }
    const adapter = new StandaloneAnalysisAdapter({
      loadSettings: async () => ({ provider: "openrouter", endpoint: "https://openrouter.ai/api/v1", model: "vision-model", apiKey: "secret" }),
      createInvoker: () => ({ invoke }),
      assets: assets as never
    })

    await expect(adapter.generatePrompt({ assetId: "video-default", purpose: "general" }))
      .resolves.toEqual({ assetId: "video-default", content: { en: "Generate the interaction", zh: "生成交互效果" } })
    expect(invoke).toHaveBeenCalledTimes(1)
  })

  test("parses bilingual prompts from OpenAI-compatible response envelopes", async () => {
    const invoke = vi.fn().mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ en: "Use a soft spring transition", zh: "使用柔和的弹簧过渡" }) } }]
    })
    const assets = {
      get: vi.fn(async () => ({ id: "video-envelope", kind: "video", analysis: { stages: [] } })),
      update: vi.fn(async (_id, patch) => patch)
    }
    const adapter = new StandaloneAnalysisAdapter({
      loadSettings: async () => ({ provider: "openrouter", endpoint: "https://openrouter.ai/api/v1", model: "vision-model", apiKey: "secret" }),
      createInvoker: () => ({ invoke }),
      assets: assets as never
    })

    await expect(adapter.generatePrompt({ assetId: "video-envelope", purpose: "general", regenerate: true }))
      .resolves.toEqual({ assetId: "video-envelope", content: { en: "Use a soft spring transition", zh: "使用柔和的弹簧过渡" } })
  })

  test("parses video prompts from multimodal text parts and prompt key aliases", async () => {
    const invoke = vi.fn().mockResolvedValue({
      content: [{
        type: "output_text",
        text: "```json\n{\"english_prompt\":\"Animate the card with a spring ease\",\"chinese_prompt\":\"使用弹簧缓动让卡片展开\"}\n```"
      }]
    })
    const assets = {
      get: vi.fn(async () => ({ id: "video-multimodal", kind: "video", analysis: { stages: [] } })),
      update: vi.fn(async (_id, patch) => patch)
    }
    const adapter = new StandaloneAnalysisAdapter({
      loadSettings: async () => ({ provider: "qwen", endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1", model: "qwen-vl-plus", apiKey: "secret" }),
      createInvoker: () => ({ invoke }),
      assets: assets as never
    })

    await expect(adapter.generatePrompt({ assetId: "video-multimodal", purpose: "general", regenerate: true }))
      .resolves.toEqual({ assetId: "video-multimodal", content: { en: "Animate the card with a spring ease", zh: "使用弹簧缓动让卡片展开" } })
  })

  test("parses LangChain kwargs envelopes and replication prompt aliases", async () => {
    const invoke = vi.fn().mockResolvedValue({
      kwargs: {
        content: JSON.stringify({
          replicationPrompt: {
            englishPrompt: "Animate the interface with a gentle fade",
            chinesePrompt: "使用柔和淡入展示界面"
          }
        })
      }
    })
    const assets = {
      get: vi.fn(async () => ({ id: "video-kwargs", kind: "video", analysis: { stages: [] } })),
      update: vi.fn(async (_id, patch) => patch)
    }
    const adapter = new StandaloneAnalysisAdapter({
      loadSettings: async () => ({ provider: "qwen", endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1", model: "qwen-vl-plus", apiKey: "secret" }),
      createInvoker: () => ({ invoke }),
      assets: assets as never
    })

    await expect(adapter.generatePrompt({ assetId: "video-kwargs", purpose: "general", regenerate: true }))
      .resolves.toEqual({ assetId: "video-kwargs", content: { en: "Animate the interface with a gentle fade", zh: "使用柔和淡入展示界面" } })
  })

  test("does not expose LangChain namespace when generating a video prompt", async () => {
    const invoke = vi.fn().mockResolvedValue({
      lc_namespace: ["langchain", "core", "messages"],
      id: ["langchain", "core", "messages", "AIMessage"],
      kwargs: { content: JSON.stringify({ en: "Build the animated panel", zh: "构建动态面板" }) }
    })
    const assets = {
      get: vi.fn(async () => ({ id: "video-message", kind: "video", analysis: { stages: [] } })),
      update: vi.fn(async (_id, patch) => patch)
    }
    const adapter = new StandaloneAnalysisAdapter({
      loadSettings: async () => ({ provider: "openrouter", endpoint: "https://openrouter.ai/api/v1", model: "vision-model", apiKey: "secret" }),
      createInvoker: () => ({ invoke }),
      assets: assets as never
    })

    await expect(adapter.generatePrompt({ assetId: "video-message", purpose: "general", regenerate: true }))
      .resolves.toEqual({ assetId: "video-message", content: { en: "Build the animated panel", zh: "构建动态面板" } })
  })

  test("accepts video prompt answers returned under provider-specific fields", async () => {
    const invoke = vi.fn().mockResolvedValue({
      answer: {
        english: ["Create a responsive card reveal", " with a soft ease"],
        chinese: { text: "使用柔和缓动创建响应式卡片展开" }
      }
    })
    const assets = {
      get: vi.fn(async () => ({ id: "video-answer", kind: "video", analysis: { stages: [] } })),
      update: vi.fn(async (_id, patch) => patch)
    }
    const adapter = new StandaloneAnalysisAdapter({
      loadSettings: async () => ({ provider: "openrouter", endpoint: "https://openrouter.ai/api/v1", model: "vision-model", apiKey: "secret" }),
      createInvoker: () => ({ invoke }),
      assets: assets as never
    })

    await expect(adapter.generatePrompt({ assetId: "video-answer", purpose: "general", regenerate: true }))
      .resolves.toEqual({ assetId: "video-answer", content: { en: "Create a responsive card reveal with a soft ease", zh: "使用柔和缓动创建响应式卡片展开" } })
  })

  test("repairs one malformed video prompt response before failing", async () => {
    const invoke = vi.fn()
      .mockResolvedValueOnce({ content: "The prompt is being prepared..." })
      .mockResolvedValueOnce({ content: JSON.stringify({ en: "Reveal the card smoothly", zh: "平滑地展开卡片" }) })
    const assets = {
      get: vi.fn(async () => ({ id: "video-repair", kind: "video", analysis: { stages: [] } })),
      update: vi.fn(async (_id, patch) => patch)
    }
    const adapter = new StandaloneAnalysisAdapter({
      loadSettings: async () => ({ provider: "openrouter", endpoint: "https://openrouter.ai/api/v1", model: "vision-model", apiKey: "secret" }),
      createInvoker: () => ({ invoke }),
      assets: assets as never
    })

    await expect(adapter.generatePrompt({ assetId: "video-repair", purpose: "general", regenerate: true }))
      .resolves.toEqual({ assetId: "video-repair", content: { en: "Reveal the card smoothly", zh: "平滑地展开卡片" } })
    expect(invoke).toHaveBeenCalledTimes(2)
    expect(String(invoke.mock.calls[1]?.[0]?.[0]?.content)).toContain("Your previous response was not parseable")
  })

  test("generates an image prompt for a legacy asset without analysis metadata", async () => {
    const invoke = vi.fn().mockResolvedValue({
      content: JSON.stringify({ en: "A soft editorial card", zh: "柔和的编辑卡片" })
    })
    const asset = {
      id: "image-legacy",
      kind: "image",
      blob: { store: "standalone", key: "images/image-legacy/original.png", mimeType: "image/png", size: 5 },
      mimeType: "image/png"
    }
    const assets = {
      get: vi.fn(async () => asset),
      update: vi.fn(async (_id, patch) => ({ ...asset, ...patch }))
    }
    const blobs = {
      get: vi.fn(async () => new Blob(["image"], { type: "image/png" }))
    }
    const adapter = new StandaloneAnalysisAdapter({
      loadSettings: async () => ({ provider: "openrouter", endpoint: "https://openrouter.ai/api/v1", model: "vision-model", apiKey: "secret" }),
      createInvoker: () => ({ invoke, invokeDesignPrompt: invoke }),
      assets: assets as never,
      blobs: blobs as never
    })

    await expect(adapter.generatePrompt({ assetId: "image-legacy", purpose: "image-design", regenerate: true }))
      .resolves.toEqual({ assetId: "image-legacy", content: { en: "A soft editorial card", zh: "柔和的编辑卡片" } })
    expect(blobs.get).toHaveBeenCalled()
    expect(assets.update).toHaveBeenCalledWith("image-legacy", expect.objectContaining({
      analysis: { prompt: { en: "A soft editorial card", zh: "柔和的编辑卡片" } }
    }))
  })

  test("analyzes a legacy video before generating its first replication prompt", async () => {
    const invoke = vi.fn().mockResolvedValue({ content: JSON.stringify({ en: "Build a smooth card transition", zh: "构建平滑卡片过渡" }) })
    const videoAnalysis = {
      summary: { en: "A card expands", zh: "卡片展开" },
      visualStyle: { colors: [], typography: "sans", layout: "centered", effects: [] },
      stages: [],
      assets: [],
      uncertainties: []
    }
    const asset = {
      id: "video-legacy",
      kind: "video",
      filename: "legacy.mp4",
      mimeType: "video/mp4",
      blob: { store: "standalone", key: "videos/video-legacy/original.mp4", mimeType: "video/mp4", size: 5 }
    }
    const assets = {
      get: vi.fn(async () => asset),
      update: vi.fn(async (_id, patch) => ({ ...asset, ...patch }))
    }
    const blobs = { get: vi.fn(async () => new Blob(["video"], { type: "video/mp4" })) }
    const analyzeVideoContent = vi.fn().mockResolvedValue(videoAnalysis)
    const adapter = new StandaloneAnalysisAdapter({
      loadSettings: async () => ({ provider: "openrouter", endpoint: "https://openrouter.ai/api/v1", model: "vision-model", apiKey: "secret" }),
      createInvoker: () => ({ invoke }),
      analyzeVideoContent,
      assets: assets as never,
      blobs: blobs as never
    })

    await expect(adapter.generatePrompt({ assetId: "video-legacy", purpose: "general", regenerate: true }))
      .resolves.toEqual({ assetId: "video-legacy", content: { en: "Build a smooth card transition", zh: "构建平滑卡片过渡" } })
    expect(analyzeVideoContent).toHaveBeenCalledWith(expect.objectContaining({ assetId: "video-legacy" }), expect.any(Object))
    expect(assets.update).toHaveBeenCalledWith("video-legacy", expect.objectContaining({ analysis: videoAnalysis }))
  })
})
