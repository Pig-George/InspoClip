import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

import { WorkspaceDetailDialog } from "./WorkspaceDetailDialog"

describe("WorkspaceDetailDialog", () => {
  it("provides one shared backdrop, frame, media column, and content body", () => {
    const html = renderToStaticMarkup(createElement(WorkspaceDetailDialog, {
      title: "Detail",
      closeLabel: "Close",
      onClose: () => undefined,
      media: createElement("img", { alt: "preview", src: "preview.png" }),
      children: createElement("div", { "data-testid": "detail-content" }, "Content")
    }))

    expect(html).toContain('data-testid="workspace-detail-dialog-backdrop"')
    expect(html).toContain('class="workspace-dialog workspace-dialog-enter"')
    expect(html).toContain('class="workspace-detail-media-column"')
    expect(html).toContain('class="workspace-detail-content"')
    expect(html).toContain('data-testid="detail-content"')
  })

  it("only closes from the backdrop or the shared close action", () => {
    const html = renderToStaticMarkup(createElement(WorkspaceDetailDialog, {
      title: "Detail",
      closeLabel: "Close",
      onClose: () => undefined,
      media: createElement("span"),
      children: createElement("button", { type: "button" }, "Body action")
    }))

    expect(html).toContain('aria-label="Close"')
    expect(html).toContain("Body action")
    expect(html).toContain('data-workspace-dialog-body="true"')
  })

  it("uses the shared closing animation contract", () => {
    const onClose = vi.fn()
    const html = renderToStaticMarkup(createElement(WorkspaceDetailDialog, {
      title: "Detail",
      closeLabel: "Close",
      onClose,
      isClosing: true,
      media: createElement("span"),
      children: createElement("div", null, "Content")
    }))

    expect(html).toContain("is-closing")
  })
})
