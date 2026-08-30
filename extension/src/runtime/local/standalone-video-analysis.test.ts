import { describe, expect, test, vi } from "vitest"

import { analyzeStandaloneVideo, parseVideoAnalysisResponse, VIDEO_ANALYSIS_PROMPT, type VideoFrame } from "./standalone-video-analysis"

const analysis = {
  summary: { en: "Card expands", zh: "卡片展开" },
  visualStyle: { colors: ["#ffffff"], typography: "sans", layout: "centered", effects: ["scale"] },
  stages: [{
    startTime: 0,
    endTime: 1,
    title: { en: "Expand", zh: "展开" },
    initialState: { en: "Collapsed", zh: "收起" },
    trigger: { en: "Click", zh: "点击" },
    actions: [{
      subject: { en: "Card", zh: "卡片" },
      action: { en: "Expands", zh: "展开" },
      from: { scale: 0.9 },
      to: { scale: 1 },
      durationMs: 300,
      delayMs: 0,
      easing: "ease-out"
    }],
    resultState: { en: "Expanded", zh: "已展开" }
  }],
  assets: [],
  uncertainties: []
}

describe("analyzeStandaloneVideo", () => {
  test("uses Bailian temporary storage for a Qwen video model", async () => {
    const uploadTemporaryFile = vi.fn().mockResolvedValue("oss://dashscope-instant/demo.mp4")
    const extractFrames = vi.fn()
    const invoke = vi.fn().mockResolvedValue({ content: JSON.stringify(analysis) })

    await expect(analyzeStandaloneVideo({
      input: { blob: new Blob(["video"], { type: "video/mp4" }), filename: "demo.mp4", mimeType: "video/mp4" },
      settings: { provider: "qwen", endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1", model: "qwen-vl-plus", apiKey: "secret", videoFrameCount: 16 },
      uploadTemporaryFile,
      extractFrames,
      invoke
    })).resolves.toEqual(analysis)

    expect(extractFrames).not.toHaveBeenCalled()
    expect(invoke).toHaveBeenCalledWith(expect.objectContaining({
      source: "video",
      ossResource: true,
      content: expect.arrayContaining([
        expect.objectContaining({ type: "video_url", video_url: { url: "oss://dashscope-instant/demo.mp4" } })
      ])
    }))
  })

  test("uses the configured number of timestamped frames for other providers", async () => {
    const frames: VideoFrame[] = [
      { dataUrl: "data:image/jpeg;base64,one", timestamp: 0 },
      { dataUrl: "data:image/jpeg;base64,two", timestamp: 4.5 }
    ]
    const extractFrames = vi.fn().mockResolvedValue(frames)
    const invoke = vi.fn().mockResolvedValue({ content: JSON.stringify(analysis) })

    await expect(analyzeStandaloneVideo({
      input: { blob: new Blob(["video"], { type: "video/webm" }), filename: "demo.webm", mimeType: "video/webm" },
      settings: { provider: "openrouter", endpoint: "https://openrouter.ai/api/v1", model: "vision-model", apiKey: "secret", videoFrameCount: 24 },
      uploadTemporaryFile: vi.fn(),
      extractFrames,
      invoke
    })).resolves.toEqual(analysis)

    expect(extractFrames).toHaveBeenCalledWith(expect.any(Blob), 24)
    expect(invoke).toHaveBeenCalledWith(expect.objectContaining({
      source: "frames",
      ossResource: false,
      content: expect.arrayContaining([
        expect.objectContaining({ text: expect.stringContaining("Frame 02 · 4.500s") })
      ])
    }))
    expect(String(invoke.mock.calls[0]?.[0].content[0].text)).toContain(VIDEO_ANALYSIS_PROMPT)
  })

  test("falls back to local frames when Bailian temporary upload is unavailable", async () => {
    const extractFrames = vi.fn().mockResolvedValue([{ dataUrl: "data:image/jpeg;base64,one", timestamp: 0 }])
    const invoke = vi.fn().mockResolvedValue({ content: JSON.stringify(analysis) })

    await expect(analyzeStandaloneVideo({
      input: { blob: new Blob(["video"]), filename: "demo.mp4", mimeType: "video/mp4" },
      settings: { provider: "qwen", endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1", model: "qwen-vl-plus", apiKey: "secret", videoFrameCount: 12 },
      uploadTemporaryFile: vi.fn().mockRejectedValue(new Error("temporary upload unavailable")),
      extractFrames,
      invoke
    })).resolves.toEqual(analysis)

    expect(extractFrames).toHaveBeenCalledWith(expect.any(Blob), 12)
  })

  test("passes the recorded duration when frame extraction needs a WebM metadata fallback", async () => {
    const extractFrames = vi.fn().mockResolvedValue([{ dataUrl: "data:image/jpeg;base64,one", timestamp: 0 }])
    const invoke = vi.fn().mockResolvedValue({ content: JSON.stringify(analysis) })

    await analyzeStandaloneVideo({
      input: {
        blob: new Blob(["video"], { type: "video/webm" }),
        filename: "recording.webm",
        mimeType: "video/webm",
        durationMs: 10_250
      },
      settings: { provider: "openrouter", endpoint: "https://openrouter.ai/api/v1", model: "vision-model", apiKey: "secret", videoFrameCount: 16 },
      extractFrames,
      invoke
    })

    expect(extractFrames).toHaveBeenCalledWith(expect.any(Blob), 16, 10.25)
  })

  test("unwraps LangChain serialized message metadata without exposing its namespace", async () => {
    const extractFrames = vi.fn().mockResolvedValue([{ dataUrl: "data:image/jpeg;base64,one", timestamp: 0 }])
    const invoke = vi.fn().mockResolvedValue({
      lc_namespace: ["langchain", "core", "messages"],
      id: ["langchain", "core", "messages", "AIMessage"],
      lc_kwargs: { content: JSON.stringify(analysis) }
    })

    await expect(analyzeStandaloneVideo({
      input: { blob: new Blob(["video"], { type: "video/webm" }), filename: "demo.webm", mimeType: "video/webm" },
      settings: { provider: "openrouter", endpoint: "https://openrouter.ai/api/v1", model: "vision-model", apiKey: "secret", videoFrameCount: 16 },
      extractFrames,
      invoke
    })).resolves.toEqual(analysis)
  })

  test("rejects ellipsis placeholders instead of treating them as analysis", () => {
    const placeholder = {
      summary: { en: "...", zh: "..." },
      visualStyle: { colors: ["..."], typography: "...", layout: "...", effects: ["..."] },
      stages: [],
      assets: ["..."],
      uncertainties: ["..."]
    }

    expect(() => parseVideoAnalysisResponse(placeholder)).toThrow("invalid video analysis")
  })

  test("rejects LangChain namespace text from the video analysis payload", () => {
    const polluted = {
      summary: { en: "langchain_coremessages", zh: "langchain_coremessages" },
      visualStyle: { colors: [], typography: "sans", layout: "centered", effects: [] },
      stages: [],
      assets: [],
      uncertainties: []
    }

    expect(() => parseVideoAnalysisResponse(polluted)).toThrow("invalid video analysis")
  })

  test("retries video analysis once when the model returns placeholder structure", async () => {
    const extractFrames = vi.fn().mockResolvedValue([{ dataUrl: "data:image/jpeg;base64,one", timestamp: 0 }])
    const placeholder = {
      summary: { en: "...", zh: "..." },
      visualStyle: { colors: [], typography: "...", layout: "...", effects: [] },
      stages: [],
      assets: [],
      uncertainties: []
    }
    const invoke = vi.fn()
      .mockResolvedValueOnce({ content: JSON.stringify(placeholder) })
      .mockResolvedValueOnce({ content: JSON.stringify(analysis) })

    await expect(analyzeStandaloneVideo({
      input: { blob: new Blob(["video"], { type: "video/webm" }), filename: "demo.webm", mimeType: "video/webm" },
      settings: { provider: "openrouter", endpoint: "https://openrouter.ai/api/v1", model: "vision-model", apiKey: "secret", videoFrameCount: 16 },
      extractFrames,
      invoke
    })).resolves.toEqual(analysis)
    expect(invoke).toHaveBeenCalledTimes(2)
    expect(invoke.mock.calls[1]?.[0].content.at(-1).text).toContain("Do not use ellipses")
  })
})
