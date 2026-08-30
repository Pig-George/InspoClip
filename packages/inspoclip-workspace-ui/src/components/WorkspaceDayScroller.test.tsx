import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, test } from "vitest"

import { WorkspaceDayScroller } from "./WorkspaceDayScroller"

describe("WorkspaceDayScroller", () => {
  test("renders the shared scroll container and footer", () => {
    const html = renderToStaticMarkup(createElement(WorkspaceDayScroller, {
      children: createElement("article", null, "Day"),
      footer: createElement("span", null, "Loading")
    }))

    expect(html).toContain('class="workspace-day-scroll"')
    expect(html).toContain("Day")
    expect(html).toContain("Loading")
  })
})
