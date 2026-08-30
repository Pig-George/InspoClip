import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, test } from "vitest"

import { WorkspaceSearchInput } from "./WorkspaceSearchInput"

describe("WorkspaceSearchInput", () => {
  test("renders a controlled search field with an accessible label", () => {
    const html = renderToStaticMarkup(createElement(WorkspaceSearchInput, {
      value: "motion",
      placeholder: "Search",
      label: "Search assets",
      onChange: () => undefined,
      icon: createElement("span", null, "#")
    }))
    expect(html).toContain('aria-label="Search assets"')
    expect(html).toContain('value="motion"')
    expect(html).toContain('placeholder="Search"')
  })
})
