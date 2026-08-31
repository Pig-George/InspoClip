import { describe, expect, test } from "vitest"

import {
  applyPromptRegenerationButtonState,
  createPromptRegenerationTracker,
  extractPromptFromImageAnalysis,
  normalizeLocalizedPrompt,
  getPromptText
} from "./prompt"

describe("content prompt helpers", () => {
  test("normalizes structured video prompt fields for content rendering", () => {
    expect(normalizeLocalizedPrompt({ en: "English", zh: "中文" })).toEqual({ en: "English", zh: "中文" })
    expect(normalizeLocalizedPrompt({ contentEn: "English", contentZh: "中文" })).toEqual({ en: "English", zh: "中文" })
    expect(normalizeLocalizedPrompt({ content: { en: "Nested", zh: "嵌套" } })).toEqual({ en: "Nested", zh: "嵌套" })
  })
  test("gives the regenerate button immediate accessible loading feedback", () => {
    const classes = new Set<string>()
    const attributes = new Map<string, string>()
    const button = {
      disabled: false,
      classList: {
        add: (name: string) => classes.add(name),
        remove: (name: string) => classes.delete(name)
      },
      setAttribute: (name: string, value: string) => attributes.set(name, value),
      removeAttribute: (name: string) => attributes.delete(name)
    }

    applyPromptRegenerationButtonState(button, true, "zh")

    expect(button.disabled).toBe(true)
    expect(classes.has("is-loading")).toBe(true)
    expect(attributes.get("aria-busy")).toBe("true")
    expect(attributes.get("aria-label")).toBe("正在重新生成 Prompt")
    expect(attributes.get("title")).toBe("正在重新生成 Prompt")

    applyPromptRegenerationButtonState(button, false, "zh")

    expect(button.disabled).toBe(false)
    expect(classes.has("is-loading")).toBe(false)
    expect(attributes.has("aria-busy")).toBe(false)
    expect(attributes.get("aria-label")).toBe("重新生成")
    expect(attributes.get("title")).toBe("重新生成")
  })

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
