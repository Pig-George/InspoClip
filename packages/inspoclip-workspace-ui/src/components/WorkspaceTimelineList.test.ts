import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, test } from "vitest"

import { WorkspaceTimelineList } from "./WorkspaceTimelineList"

describe("WorkspaceTimelineList", () => {
  test("renders grouped timeline items with shared structure", () => {
    const html = renderToStaticMarkup(createElement(WorkspaceTimelineList<string>, {
      groups: [{ id: "2026-08", label: "August 2026", meta: "2 inspirations", items: ["A", "B"] }],
      renderItem: (item: string) => createElement("article", null, item)
    }))
    expect(html).toContain('data-total-assets="2"')
    expect(html).toContain("August 2026")
    expect(html).toContain("2 inspirations")
    expect(html).toContain("<article>A</article>")
  })

  test("renders an empty state when no groups are available", () => {
    const html = renderToStaticMarkup(createElement(WorkspaceTimelineList<string>, {
      groups: [],
      empty: "No inspirations",
      renderItem: () => null
    }))
    expect(html).toContain("No inspirations")
  })
})
