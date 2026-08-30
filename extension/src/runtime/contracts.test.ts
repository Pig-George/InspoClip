import { describe, expect, test } from "vitest"

import { failure, isTerminalJobStatus, success, type AnalysisJob } from "./contracts"

describe("runtime contracts", () => {
  test("uses the same lifecycle for image and video jobs", () => {
    const imageJob: AnalysisJob = {
      id: "image-job",
      assetId: "image-asset",
      assetKind: "image",
      mode: "backend",
      status: "processing",
      progress: 45,
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-01T00:00:01.000Z"
    }
    const videoJob: AnalysisJob = {
      ...imageJob,
      id: "video-job",
      assetId: "video-asset",
      assetKind: "video",
      status: "completed"
    }

    expect(isTerminalJobStatus(imageJob.status)).toBe(false)
    expect(isTerminalJobStatus(videoJob.status)).toBe(true)
    expect(isTerminalJobStatus("failed")).toBe(true)
    expect(isTerminalJobStatus("cancelled")).toBe(true)
  })

  test("creates discriminated command results", () => {
    expect(success({ id: "asset-1" })).toEqual({ ok: true, data: { id: "asset-1" } })
    expect(failure({ code: "NETWORK_ERROR", message: "offline", retryable: true })).toEqual({
      ok: false,
      error: { code: "NETWORK_ERROR", message: "offline", retryable: true }
    })
  })
})
