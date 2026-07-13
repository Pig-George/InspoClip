import { describe, expect, test } from "vitest"

import { getManifestContentScriptFiles, getTabAccessErrorMessage, isInjectableTabUrl } from "./tabs"

describe("popup tab messaging helpers", () => {
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
})
