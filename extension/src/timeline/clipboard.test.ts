import { describe, expect, test } from "vitest"

import { clipboardAssetFiles } from "./clipboard"

describe("timeline clipboard assets", () => {
  test("extracts supported image and video files from a paste event", () => {
    const image = new File(["image"], "capture.png", { type: "image/png" })
    const video = new File(["video"], "recording.webm", { type: "video/webm" })
    const event = {
      clipboardData: {
        files: [image, video],
        items: []
      }
    } as unknown as ClipboardEvent

    expect(clipboardAssetFiles(event)).toEqual([image, video])
  })

  test("ignores unsupported clipboard files", () => {
    const text = new File(["text"], "notes.txt", { type: "text/plain" })
    const event = {
      clipboardData: {
        files: [text],
        items: []
      }
    } as unknown as ClipboardEvent

    expect(clipboardAssetFiles(event)).toEqual([])
  })
})
