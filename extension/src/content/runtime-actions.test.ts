import { describe, expect, test } from "vitest"

import { analyzeImageWithRuntime, startVideoWithRuntime } from "./runtime-actions"
import type { RuntimeMessageSender } from "../runtime/command-client"

function createSender(response: unknown, messages: unknown[]): RuntimeMessageSender {
  return async (message) => {
    messages.push(message)
    return { ok: true, data: response }
  }
}

describe("content runtime actions", () => {
  test("sends serialized image data through the runtime command", async () => {
    const messages: unknown[] = []
    const blob = new Blob(["image"], { type: "image/png" })
    const result = await analyzeImageWithRuntime(
      blob,
      "area.png",
      createSender({ result: { title: "Example" } }, messages)
    )

    expect(result).toEqual({ title: "Example" })
    expect(messages[0]).toMatchObject({
      type: "runtime.analysis.image.start",
      payload: {
        filename: "area.png",
        mimeType: "image/png",
        dataUrl: "data:image/png;base64,aW1hZ2U="
      }
    })
  })

  test("preserves video metadata when starting runtime analysis", async () => {
    const messages: unknown[] = []
    const blob = new Blob(["video"], { type: "video/webm" })
    await startVideoWithRuntime(
      blob,
      "recording.webm",
      12500,
      createSender({ id: "job-1", assetId: "asset-1", status: "queued" }, messages)
    )

    expect(messages[0]).toMatchObject({
      type: "runtime.analysis.video.start",
      payload: {
        filename: "recording.webm",
        mimeType: "video/webm",
        draft: true,
        durationMs: 12500
      }
    })
  })
})
