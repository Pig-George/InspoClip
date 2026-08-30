import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, test } from "vitest"

import { WorkspaceCollapsiblePanel } from "./WorkspaceCollapsiblePanel"

describe("WorkspaceCollapsiblePanel", () => {
  test("renders an accessible toggle and content only when open", () => {
    const open = renderToStaticMarkup(createElement(WorkspaceCollapsiblePanel, {
      open: true,
      label: "Notes",
      onOpenChange: () => undefined,
      children: createElement("textarea", { "aria-label": "Notes" })
    }))
    expect(open).toContain('aria-expanded="true"')
    expect(open).toContain('aria-label="Notes"')

    const closed = renderToStaticMarkup(createElement(WorkspaceCollapsiblePanel, {
      open: false,
      label: "Notes",
      onOpenChange: () => undefined,
      children: createElement("textarea", { "aria-label": "Notes" })
    }))
    expect(closed).toContain('aria-expanded="false"')
    expect(closed).not.toContain("textarea")
  })
})
