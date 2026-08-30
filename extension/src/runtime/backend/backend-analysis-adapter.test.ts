import { describe, expect, test } from "vitest"

import { BackendAnalysisAdapter } from "./backend-analysis-adapter"
import { BackendHttpClient, type FetchLike } from "./http-client"

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  })
}

function createAdapter(fetchFn: FetchLike) {
  return new BackendAnalysisAdapter(
    new BackendHttpClient("http://localhost:3001/", fetchFn),
    fetchFn,
    {
      createId: () => "generated-id",
      now: () => "2026-08-01T00:00:00.000Z"
    }
  )
}

describe("BackendAnalysisAdapter", () => {
  test("analyzes an image blob through the backend endpoint", async () => {
    const calls: Array<[string, RequestInit | undefined]> = []
    const fetchFn: FetchLike = async (url, init) => {
      calls.push([String(url), init])
      return jsonResponse({ terms: ["motion"], prompt: { en: "demo", zh: "示例" } })
    }
    const adapter = createAdapter(fetchFn)

    const job = await adapter.analyzeImage({
      blob: new Blob(["image"], { type: "image/png" }),
      filename: "ui.png",
      mimeType: "image/png"
    })

    expect(calls[0][0]).toBe("http://localhost:3001/api/images/analyze")
    expect(calls[0][1]?.method).toBe("POST")
    expect((calls[0][1]?.body as FormData).get("image")).toBeInstanceOf(Blob)
    expect(job).toMatchObject({
      id: "generated-id",
      assetKind: "image",
      mode: "backend",
      status: "completed",
      progress: 100,
      result: { terms: ["motion"] }
    })
  })

  test("uploads a video with extension source and draft state", async () => {
    const calls: Array<[string, RequestInit | undefined]> = []
    const fetchFn: FetchLike = async (url, init) => {
      calls.push([String(url), init])
      return jsonResponse({ videoId: "video-1", jobId: "job-1", status: "pending" }, 202)
    }
    const adapter = createAdapter(fetchFn)

    const job = await adapter.analyzeVideo({
      blob: new Blob(["video"], { type: "video/mp4" }),
      filename: "demo.mp4",
      mimeType: "video/mp4",
      draft: true
    })

    const form = calls[0][1]?.body as FormData
    expect(calls[0][0]).toBe("http://localhost:3001/api/videos")
    expect(form.get("source")).toBe("extension")
    expect(form.get("draft")).toBe("true")
    expect(job).toMatchObject({
      id: "job-1",
      assetId: "video-1",
      assetKind: "video",
      status: "queued"
    })
  })

  test("rejects protected video URLs before fetching", async () => {
    const adapter = createAdapter(async () => {
      throw new Error("fetch must not be called")
    })

    await expect(adapter.uploadVideoUrl("blob:https://example.com/video", { draft: true }))
      .rejects.toMatchObject({
        detail: {
          code: "VIDEO_URL_UNSUPPORTED",
          retryable: false
        }
      })
  })

  test("downloads an HTTP video and uploads the resulting blob", async () => {
    const calls: string[] = []
    const fetchFn: FetchLike = async (url) => {
      calls.push(String(url))
      if (String(url).startsWith("https://")) {
        return new Response(new Blob(["video"], { type: "video/mp4" }), { status: 200 })
      }
      return jsonResponse({ videoId: "video-1", jobId: "job-1", status: "pending" }, 202)
    }
    const adapter = createAdapter(fetchFn)

    await adapter.uploadVideoUrl("https://example.com/demo.mp4", { draft: true })

    expect(calls).toEqual([
      "https://example.com/demo.mp4",
      "http://localhost:3001/api/videos"
    ])
  })

  test("downloads a video with the Worker global fetch context", async () => {
    const fetchFn = (async function (this: unknown, url: string | URL | Request) {
      if (this !== globalThis) throw new TypeError("Illegal invocation")
      if (String(url).startsWith("https://")) {
        return new Response(new Blob(["video"], { type: "video/mp4" }), { status: 200 })
      }
      return jsonResponse({ videoId: "video-1", jobId: "job-1", status: "pending" }, 202)
    }) as FetchLike
    const adapter = createAdapter(fetchFn)

    await expect(adapter.uploadVideoUrl("https://example.com/demo.mp4")).resolves.toMatchObject({ jobId: "job-1" })
  })

  test("polling recovers from a transient browser network change", async () => {
    let calls = 0
    const waits: number[] = []
    const fetchFn: FetchLike = async () => {
      calls += 1
      if (calls === 1) throw new TypeError("network changed")
      return jsonResponse({ id: "job-1", videoId: "video-1", status: "completed", progress: 100 })
    }
    const adapter = createAdapter(fetchFn)

    const result = await adapter.pollVideoJobRaw<{ status: string }>("job-1", {
      retryBaseMs: 25,
      wait: async (ms) => { waits.push(ms) }
    })

    expect(result.status).toBe("completed")
    expect(calls).toBe(2)
    expect(waits).toEqual([25])
  })

  test("gets cached prompts and forces prompt regeneration with purpose and language", async () => {
    const calls: Array<[string, RequestInit | undefined]> = []
    const fetchFn: FetchLike = async (url, init) => {
      calls.push([String(url), init])
      return jsonResponse({ en: "prompt", zh: "提示词" })
    }
    const adapter = createAdapter(fetchFn)

    await adapter.generatePrompt({
      assetId: "video-1",
      purpose: "frontend",
      language: "zh",
      regenerate: false
    })
    await adapter.generatePrompt({
      assetId: "video-1",
      purpose: "frontend",
      language: "zh",
      regenerate: true
    })

    expect(calls[0][0]).toBe("http://localhost:3001/api/videos/video-1/prompts?purpose=frontend&language=zh")
    expect(calls[0][1]?.method).toBe("GET")
    expect(calls[1][0]).toBe("http://localhost:3001/api/videos/video-1/prompts")
    expect(calls[1][1]?.method).toBe("POST")
    expect(JSON.parse(String(calls[1][1]?.body))).toEqual({
      purpose: "frontend",
      language: "zh",
      force: true
    })
  })
})
