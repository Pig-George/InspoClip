import { describe, expect, test } from "vitest"

import { detectAssetKind, getExtensionIconPath, uploadImageForAnalysis } from "./assets"

describe("popup asset helpers", () => {
  test("uses the generated Plasmo icon path from the runtime manifest", () => {
    expect(getExtensionIconPath({ icons: { "48": "icon48.plasmo.hash.png" } })).toBe("icon48.plasmo.hash.png")
  })

  test("falls back to another manifest icon when the preferred size is missing", () => {
    expect(getExtensionIconPath({ icons: { "128": "icon128.plasmo.hash.png" } })).toBe("icon128.plasmo.hash.png")
  })

  test("keeps a legacy fallback for unpackaged environments", () => {
    expect(getExtensionIconPath({})).toBe("assets/icon48.png")
  })

  test("detects supported image and video files", () => {
    expect(detectAssetKind(new File(["x"], "demo.png", { type: "image/png" }))).toBe("image")
    expect(detectAssetKind(new File(["x"], "demo.mp4", { type: "video/mp4" }))).toBe("video")
    expect(detectAssetKind(new File(["x"], "demo.mov", { type: "" }))).toBe("video")
    expect(detectAssetKind(new File(["x"], "notes.txt", { type: "text/plain" }))).toBe("unsupported")
  })

  test("uploads an image asset to the analyze endpoint", async () => {
    const calls: Array<[string, RequestInit]> = []
    const fetchFn = (async (url: string, options: RequestInit) => {
      calls.push([url, options])
      return { ok: true, json: async () => ({ terms: ["motion"], colors: ["#fff"], prompt: { en: "", zh: "" } }) }
    }) as typeof fetch

    const result = await uploadImageForAnalysis(fetchFn, "http://localhost:3001/", new File(["x"], "ui.png", { type: "image/png" }))

    expect(result.terms).toEqual(["motion"])
    expect(calls[0][0]).toBe("http://localhost:3001/api/images/analyze")
    expect((calls[0][1].body as FormData).get("image")).toBeInstanceOf(File)
  })
})
