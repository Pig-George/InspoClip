import { describe, expect, test } from "vitest"

import {
  clearVideoPromptInflight,
  getVideoPromptInflight,
  setVideoPromptInflight,
  videoPromptRequestKey
} from "./video-prompt-state"

describe("video prompt inflight state", () => {
  test("builds a stable key with normalized target text", () => {
    expect(videoPromptRequestKey("video-1", "frontend", " React app ")).toBe("video-1::frontend::React app")
  })

  test("keeps an inflight generation promise available for reopened modals", async () => {
    const key = videoPromptRequestKey("video-2", "general", "")
    const promise = Promise.resolve({ contentEn: "Generate UI", contentZh: "生成 UI" })

    setVideoPromptInflight(key, promise)

    expect(getVideoPromptInflight(key)).toBe(promise)
    await expect(getVideoPromptInflight(key)).resolves.toEqual({ contentEn: "Generate UI", contentZh: "生成 UI" })
    clearVideoPromptInflight(key, promise)
    expect(getVideoPromptInflight(key)).toBeUndefined()
  })

  test("does not clear a newer inflight promise with an older promise reference", () => {
    const key = videoPromptRequestKey("video-3", "json", "")
    const older = Promise.resolve("old")
    const newer = Promise.resolve("new")

    setVideoPromptInflight(key, newer)
    clearVideoPromptInflight(key, older)

    expect(getVideoPromptInflight(key)).toBe(newer)
    clearVideoPromptInflight(key, newer)
  })
})
