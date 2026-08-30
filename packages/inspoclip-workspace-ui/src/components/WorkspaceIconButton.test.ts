import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, test } from "vitest"

import { WorkspaceIconButton } from "./WorkspaceIconButton"

describe("WorkspaceIconButton", () => {
  test("renders icon-only controls with accessible naming and state", () => {
    const html = renderToStaticMarkup(createElement(WorkspaceIconButton, {
      label: "Refresh",
      icon: createElement("svg", { "aria-hidden": true }),
      disabled: true,
      className: "toolbar-button"
    }))
    expect(html).toContain('aria-label="Refresh"')
    expect(html).toContain('title="Refresh"')
    expect(html).toContain("disabled")
    expect(html).toContain('class="toolbar-button"')
  })
})
