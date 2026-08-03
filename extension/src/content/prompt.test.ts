import { describe, expect, test } from "vitest"

import {
  createPromptRegenerationTracker,
  extractPromptFromImageAnalysis,
  getPromptText
} from "./prompt"

describe("content prompt helpers", () => {
  test("uses locale when language mode is auto", () => {
    expect(getPromptText({ en: "English", zh: "中文" }, "auto", "zh")).toBe("中文")
    expect(getPromptText({ en: "English", zh: "中文" }, "auto", "en")).toBe("English")
  })

  test("falls back when requested language is missing", () => {
    expect(getPromptText({ en: "English" }, "zh", "zh")).toBe("English")
  })

  test("joins both languages for both mode", () => {
    expect(getPromptText({ en: "English", zh: "中文" }, "both", "en")).toBe("English\n\n中文")
  })

  test("keeps a prompt regeneration active while its modal is closed and reopened", async () => {
    const tracker = createPromptRegenerationTracker<object>()
    const historyEntry = {}
    let complete: (() => void) | undefined
    const request = new Promise<void>((resolve) => { complete = resolve })

    const trackedRequest = tracker.start(historyEntry, request)
    expect(tracker.isActive(historyEntry)).toBe(true)

    complete?.()
    await trackedRequest

    expect(tracker.isActive(historyEntry)).toBe(false)
  })

  test("extracts a refreshed bilingual prompt from an image analysis response", () => {
    expect(extractPromptFromImageAnalysis({
      terms: ["glass card"],
      prompt: { en: "Refreshed prompt", zh: "Updated prompt" }
    })).toEqual({ en: "Refreshed prompt", zh: "Updated prompt" })
  })
})
