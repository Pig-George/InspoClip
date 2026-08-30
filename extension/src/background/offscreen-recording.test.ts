import { describe, expect, test } from "vitest"

import {
  getExtensionRelativeUrl,
  getOffscreenDocumentOptions,
  getTabCaptureStreamOptions,
  normalizeTabCaptureErrorMessage,
  openAreaCaptureSelector,
  prepareTabCaptureSource,
  startAreaCaptureWithPreparedSource
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
      reasons: ["USER_MEDIA", "BLOBS"],
      justification: "Record, crop, and decode local video for InspoClip analysis"
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

  test("prepares the recording source before opening the area selector", async () => {
    const calls: string[] = []

    await startAreaCaptureWithPreparedSource(42, "analyze", {
      createSourceId: () => "source-1",
      prepareSource: async (tabId, sourceId) => {
        calls.push(`prepare:${tabId}:${sourceId}`)
      },
      sendContentMessage: async (tabId, message) => {
        calls.push(`content:${tabId}:${message.recordingSourceId}`)
      },
      releaseSource: async (sourceId) => {
        calls.push(`release:${sourceId}`)
      }
    })

    expect(calls).toEqual(["prepare:42:source-1", "content:42:source-1"])
  })

  test("opens the area selector without creating a recording source", async () => {
    const sendContentMessage = async (tabId: number, message: unknown) => {
      expect(tabId).toBe(42)
      expect(message).toEqual({ type: "START_AREA_CAPTURE", mode: "analyze" })
      return { ok: true }
    }

    await expect(openAreaCaptureSelector(42, "analyze", { sendContentMessage })).resolves.toBeUndefined()
  })

  test("releases a prepared source when the selector cannot be opened", async () => {
    const calls: string[] = []

    await expect(
      startAreaCaptureWithPreparedSource(42, "save", {
        createSourceId: () => "source-2",
        prepareSource: async () => {
          calls.push("prepare")
        },
        sendContentMessage: async () => {
          calls.push("content")
          throw new Error("content unavailable")
        },
        releaseSource: async (sourceId) => {
          calls.push(`release:${sourceId}`)
        }
      })
    ).rejects.toThrow("content unavailable")

    expect(calls).toEqual(["prepare", "content", "release:source-2"])
  })
})
