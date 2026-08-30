import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, test } from "vitest"

import { WorkspaceHeaderLayout } from "./WorkspaceHeaderLayout"

describe("WorkspaceHeaderLayout", () => {
  test("renders shared header slots", () => {
    const html = renderToStaticMarkup(createElement(WorkspaceHeaderLayout, {
      left: createElement("span", null, "Views"),
      heading: createElement("div", null, "Week 32"),
      actions: createElement("span", null, "Actions")
    }))

    expect(html).toContain('class="workspace-header-layout"')
    expect(html).toContain("Views")
    expect(html).toContain("Week 32")
    expect(html).toContain("Actions")
  })
})
