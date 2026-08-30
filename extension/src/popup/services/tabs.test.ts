import { afterEach, describe, expect, test, vi } from "vitest"

import { getManifestContentScriptFiles, getTabAccessErrorMessage, getTabDisplayLabel, isInjectableTabUrl, openOrFocusLocalTimeline, requestAreaCaptureSession } from "./tabs"

describe("popup tab messaging helpers", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test("reads generated Plasmo content script files from the manifest", () => {
    expect(
      getManifestContentScriptFiles({
        content_scripts: [{ js: ["inspoclip.abc123.js"], css: [] } as { js: string[] }]
      })
    ).toEqual(["inspoclip.abc123.js"])
  })

  test("returns an empty list when the manifest has no content scripts", () => {
    expect(getManifestContentScriptFiles({})).toEqual([])
  })

  test("allows normal web pages for content script messaging", () => {
    expect(isInjectableTabUrl("https://example.com/demo")).toBe(true)
    expect(isInjectableTabUrl("http://localhost:5173")).toBe(true)
  })

  test("formats the active page as a compact host label", () => {
    expect(getTabDisplayLabel("https://dribbble.com/shots/interaction?id=1")).toBe("dribbble.com")
    expect(getTabDisplayLabel("http://localhost:5173/demo")).toBe("localhost:5173")
    expect(getTabDisplayLabel(undefined)).toBe("")
  })

  test("rejects browser-managed pages before trying to inject content scripts", () => {
    expect(isInjectableTabUrl("chrome://extensions/")).toBe(false)
    expect(isInjectableTabUrl("chrome-extension://abc/popup.html")).toBe(false)
    expect(isInjectableTabUrl("about:blank")).toBe(false)
    expect(isInjectableTabUrl("file:///Users/demo/video.html")).toBe(false)
  })

  test("explains why the current page cannot receive analysis UI", () => {
    expect(getTabAccessErrorMessage("chrome://extensions/")).toContain("Cannot access this page")
  })

  test("uses localized tab access warnings when provided", () => {
    const messages = {
      inaccessiblePage: "无法访问当前页面。请打开普通的 http/https 网页后再试。",
      inaccessibleFilePage: "无法访问本地文件页面。"
    }

    expect(getTabAccessErrorMessage("chrome://extensions/", messages)).toBe(messages.inaccessiblePage)
    expect(getTabAccessErrorMessage("file:///Users/demo/video.html", messages)).toBe(messages.inaccessibleFilePage)
  })

  test("starts area capture through the background permission session", async () => {
    const sendMessage = vi.fn().mockResolvedValue({ success: true })
    vi.stubGlobal("chrome", { runtime: { sendMessage } })

    await requestAreaCaptureSession("analyze")

    expect(sendMessage).toHaveBeenCalledWith({ type: "START_AREA_CAPTURE_SESSION", mode: "analyze" })
  })

  test("surfaces background preparation failures", async () => {
    vi.stubGlobal("chrome", {
      runtime: { sendMessage: vi.fn().mockResolvedValue({ success: false, error: "permission denied" }) }
    })

    await expect(requestAreaCaptureSession("save")).rejects.toThrow("permission denied")
  })

  test("opens or focuses the extension local timeline", async () => {
    const update = vi.fn().mockResolvedValue(undefined)
    const create = vi.fn().mockResolvedValue(undefined)
    const focus = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal("chrome", {
      runtime: { getURL: vi.fn(() => "chrome-extension://id/tabs/timeline.html") },
      tabs: {
        query: vi.fn().mockResolvedValue([{ id: 7, windowId: 2, url: "chrome-extension://id/tabs/timeline.html" }]),
        update,
        create
      },
      windows: { update: focus }
    })

    await openOrFocusLocalTimeline()

    expect(update).toHaveBeenCalledWith(7, { active: true })
    expect(focus).toHaveBeenCalledWith(2, { focused: true })
    expect(create).not.toHaveBeenCalled()
  })
})
