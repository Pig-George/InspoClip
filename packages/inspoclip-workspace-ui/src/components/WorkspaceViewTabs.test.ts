import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, test } from "vitest"

import { WorkspaceViewTabs } from "./WorkspaceViewTabs"

describe("WorkspaceViewTabs", () => {
  test("renders all modes with one selected tab", () => {
    const html = renderToStaticMarkup(createElement(WorkspaceViewTabs, {
      value: "week",
      labels: { day: "Day", week: "Week", timeline: "Timeline" },
      onChange: () => undefined,
      renderIcon: (mode) => createElement("i", { "data-mode": mode })
    }))
    expect((html.match(/role="tab"/g) || []).length).toBe(3)
    expect(html).toContain('aria-label="Week" aria-selected="true"')
    expect(html).toContain('data-mode="timeline"')
    expect(html).toContain('class="workspace-view-tabs"')
    expect(html).toContain('workspace-view-tab is-active')
    expect(html).not.toMatch(/\b(p-\d|rounded-|bg-|text-|transition)/)
  })
})
