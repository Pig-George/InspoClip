import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, test } from "vitest"

import { WorkspaceAssetCard } from "./WorkspaceAssetCard"

describe("WorkspaceAssetCard", () => {
  test("renders the shared card frame, media, caption, decoration, and term", () => {
    const html = renderToStaticMarkup(createElement(WorkspaceAssetCard, {
      kind: "image",
      title: "Panel transition",
      alt: "Panel transition preview",
      mediaSrc: "preview.png",
      decoration: "tape",
      rotation: -1,
      term: { en: "Minimal", zh: "极简", showZh: true, remaining: 2 },
      onClick: () => undefined,
      children: createElement("span", { "data-testid": "extra" }, "Extra")
    }))

    expect(html).toContain('class="polaroid workspace-polaroid workspace-asset-card"')
    expect(html).toContain('data-workspace-card="true"')
    expect(html).toContain('src="preview.png"')
    expect(html).toContain('class="workspace-card-media-content"')
    expect(html).not.toContain('w-full h-full object-cover')
    expect(html).toContain("Panel transition")
    expect(html).toContain("Minimal")
    expect(html).toContain("极简")
    expect(html).toContain('data-testid="extra"')
  })

  test("supports video duration and status without requiring app APIs", () => {
    const html = renderToStaticMarkup(createElement(WorkspaceAssetCard, {
      kind: "video",
      title: "Motion demo",
      alt: "Motion demo preview",
      mediaSrc: "demo.mp4",
      durationLabel: "00:08",
      subtitle: "Analysis complete",
      onClick: () => undefined
    }))

    expect(html).toContain('src="demo.mp4"')
    expect(html).toContain("00:08")
    expect(html).toContain("Analysis complete")
  })
})
