import { describe, expect, test } from "vitest"

import { buildClientVideoUrl, isSupportedVideoUrl, pollVideoJob, uploadVideoBlob } from "./video"

describe("video helpers", () => {
  test("accepts HTTP video URLs and rejects blob URLs", () => {
    expect(isSupportedVideoUrl("https://example.com/demo.mp4")).toBe(true)
    expect(isSupportedVideoUrl("blob:https://example.com/123")).toBe(false)
  })

  test("builds the client detail URL", () => {
    expect(buildClientVideoUrl("http://localhost:8080/", "abc")).toBe("http://localhost:8080/?video=abc")
  })

  test("uploads a video blob with extension source", async () => {
    const calls: Array<[string, RequestInit]> = []
    const fetchFn = (async (url: string, options: RequestInit) => {
      calls.push([url, options])
      return { ok: true, json: async () => ({ videoId: "v", jobId: "j", status: "pending" }) }
    }) as typeof fetch

    const result = await uploadVideoBlob<{ videoId: string }>(
      fetchFn,
      "http://localhost:3001/",
      new Blob(["x"], { type: "video/mp4" }),
      "demo.mp4"
    )

    expect(result.videoId).toBe("v")
    expect(calls[0][0]).toBe("http://localhost:3001/api/videos")
    expect((calls[0][1].body as FormData).get("source")).toBe("extension")
  })

  test("can upload a video blob as an unsaved draft for analysis", async () => {
    const calls: Array<[string, RequestInit]> = []
    const fetchFn = (async (url: string, options: RequestInit) => {
      calls.push([url, options])
      return { ok: true, json: async () => ({ videoId: "v", jobId: "j", status: "pending" }) }
    }) as typeof fetch

    await uploadVideoBlob(fetchFn, "http://localhost:3001/", new Blob(["x"], { type: "video/mp4" }), "demo.mp4", { draft: true })

    expect((calls[0][1].body as FormData).get("draft")).toBe("true")
  })

  test("polling stops on completed status", async () => {
    let calls = 0
    const fetchFn = (async () => ({
      ok: true,
      json: async () => ({ status: ++calls === 1 ? "processing" : "completed", progress: calls * 50 })
    })) as unknown as typeof fetch
    const updates: string[] = []

    const result = await pollVideoJob(fetchFn, "http://localhost:3001", "j", {
      intervalMs: 0,
      wait: async () => {},
      onUpdate: (job) => updates.push(job.status)
    })

    expect(result.status).toBe("completed")
    expect(updates).toEqual(["processing", "completed"])
  })
})
