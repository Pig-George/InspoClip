import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, test } from "vitest"

import { WorkspaceMediaPreview } from "./WorkspaceMediaPreview"

describe("WorkspaceMediaPreview", () => {
  test("renders image and video media with the shared presentation contract", () => {
    const image = renderToStaticMarkup(createElement(WorkspaceMediaPreview, {
      kind: "image",
      src: "https://example.test/design.png",
      alt: "Design image",
      className: "card-media"
    }))
    const video = renderToStaticMarkup(createElement(WorkspaceMediaPreview, {
      kind: "video",
      src: "blob:video",
      alt: "Motion demo",
      videoProps: { controls: true }
    }))

    expect(image).toContain('<img')
    expect(image).toContain('src="https://example.test/design.png"')
    expect(image).toContain('class="inspoclip-media-preview card-media"')
    expect(video).toContain('<video')
    expect(video).toContain('controls=""')
  })

  test("renders the consumer fallback when media is unavailable", () => {
    const html = renderToStaticMarkup(createElement(WorkspaceMediaPreview, {
      kind: "image",
      alt: "Unavailable preview",
      fallback: createElement("span", null, "Preview unavailable")
    }))

    expect(html).toContain("Preview unavailable")
    expect(html).not.toContain("<img")
  })
})
