import { describe, expect, test } from "vitest"

import { buildAssetAnalysisMessage, detectAssetKind, fileToDataUrl, getExtensionIconPath } from "./assets"

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

  test("converts a file into an asset analysis message for content script rendering", async () => {
    const file = new File(["hello"], "demo.png", { type: "image/png" })

    const message = await buildAssetAnalysisMessage(file)

    expect(message).toMatchObject({
      type: "START_ASSET_ANALYSIS",
      assetKind: "image",
      fileName: "demo.png",
      mimeType: "image/png"
    })
    expect(message.dataUrl).toContain("data:image/png;base64,")
  })

  test("converts files to data URLs", async () => {
    await expect(fileToDataUrl(new File(["hello"], "demo.txt", { type: "text/plain" })))
      .resolves.toContain("data:text/plain;base64,")
  })
})
