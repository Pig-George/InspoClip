import { describe, expect, test } from "vitest"

import {
  getExtensionRelativeUrl,
  getOffscreenDocumentOptions,
  getTabCaptureStreamOptions,
  normalizeTabCaptureErrorMessage,
  prepareTabCaptureSource
} from "./offscreen-recording"

describe("offscreen recording helpers", () => {
  test("targets the active tab stream for extension offscreen consumption", () => {
    expect(getTabCaptureStreamOptions(42)).toEqual({
      targetTabId: 42
    })
  })

  test("creates the offscreen document options", () => {
    expect(getOffscreenDocumentOptions("offscreen.html")).toEqual({
      url: "offscreen.html",
      reasons: ["USER_MEDIA"],
      justification: "Record and crop the active tab area for InspoClip video analysis"
    })
  })

  test("converts bundled extension URLs to relative offscreen document paths", () => {
    expect(getExtensionRelativeUrl("chrome-extension://abc/offscreen.1234.html")).toBe("offscreen.1234.html")
    expect(getExtensionRelativeUrl("chrome-extension://abc/static/background/../../offscreen.1234.html")).toBe("offscreen.1234.html")
    expect(getExtensionRelativeUrl("/offscreen.1234.html")).toBe("offscreen.1234.html")
    expect(getExtensionRelativeUrl("offscreen.html")).toBe("offscreen.html")
  })

  test("normalizes expired tab capture invocation errors", () => {
    expect(normalizeTabCaptureErrorMessage("Extension has not been invoked for the current page")).toContain("Recording permission expired")
    expect(normalizeTabCaptureErrorMessage(undefined)).toBe("Failed to start tab capture")
  })

  test("acquires the stream id before awaiting a cold offscreen document", async () => {
    const calls: string[] = []

    const response = await prepareTabCaptureSource(42, "source-1", {
      getStreamId: async (options) => {
        calls.push(`stream:${options.targetTabId}`)
        return "stream-1"
      },
      ensureOffscreenDocument: async () => {
        calls.push("offscreen")
      },
      sendOffscreenMessage: async (message) => {
        calls.push(`prepare:${message.streamId}`)
        return { success: true }
      }
    })

    expect(calls).toEqual(["stream:42", "offscreen", "prepare:stream-1"])
    expect(response).toEqual({ success: true })
  })
})
