import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, test } from "vitest"

import { WorkspaceDialogFrame } from "./WorkspaceDialogFrame"

describe("WorkspaceDialogFrame", () => {
  test("keeps media and content in a labelled dialog frame", () => {
    const html = renderToStaticMarkup(createElement(WorkspaceDialogFrame, {
      title: "Image details",
      kindLabel: "Image",
      closeLabel: "Close",
      onClose: () => undefined,
      media: createElement("img", { alt: "Preview" }),
      children: createElement("p", null, "Summary")
    }))
    expect(html).toContain('role="dialog"')
    expect(html).toContain('aria-label="Image details"')
    expect(html).toContain("Preview")
    expect(html).toContain("Summary")
    expect(html).toContain("Image")
  })

  test("keeps the title above the content inside the detail sidebar", () => {
    const html = renderToStaticMarkup(createElement(WorkspaceDialogFrame, {
      title: "Video details",
      closeLabel: "Close",
      onClose: () => undefined,
      media: createElement("video", { "data-testid": "preview" }),
      children: createElement("p", null, "Stage analysis")
    }))

    expect(html).toMatch(/data-workspace-dialog-media="true"[\s\S]*data-workspace-dialog-sidebar="true"/)
    expect(html).toMatch(/data-workspace-dialog-sidebar="true"[\s\S]*<header[\s\S]*Video details[\s\S]*data-workspace-dialog-body="true"[\s\S]*Stage analysis/)
  })

  test("renders optional header actions beside the close control", () => {
    const html = renderToStaticMarkup(createElement(WorkspaceDialogFrame, {
      title: "Image details",
      closeLabel: "Close",
      onClose: () => undefined,
      media: createElement("img", { alt: "Preview" }),
      children: createElement("p", null, "Summary"),
      headerActions: createElement("button", { type: "button", "aria-label": "Delete" }, "Delete")
    }))
    expect(html).toContain("workspace-dialog-actions")
    expect(html).toContain('aria-label="Delete"')
  })
})
