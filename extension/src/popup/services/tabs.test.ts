import { afterEach, describe, expect, test, vi } from "vitest"

import { getManifestContentScriptFiles, getTabAccessErrorMessage, isInjectableTabUrl, requestAreaCaptureSession } from "./tabs"

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
})
