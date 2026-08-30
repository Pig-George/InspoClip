import React, { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, test } from "vitest"

import { WorkspaceViewContent } from "./WorkspaceViewContent"

Object.assign(globalThis, { React })

function board(label: string) {
  return createElement("section", { className: "workspace-day-board" }, label)
}

describe("WorkspaceViewContent", () => {
  test.each(["day", "week"] as const)("does not render the %s board beside workspace-empty", (viewMode) => {
    const html = renderToStaticMarkup(createElement(WorkspaceViewContent, {
      hasContent: false,
      viewMode,
      day: board("day"),
      week: board("week"),
      timeline: createElement("section", { className: "workspace-timeline-view" }, "timeline")
    }))

    expect(html).not.toContain("workspace-day-board")
  })

  test("renders only the selected workspace when content exists", () => {
    const html = renderToStaticMarkup(createElement(WorkspaceViewContent, {
      hasContent: true,
      viewMode: "week",
      day: board("day"),
      week: board("week"),
      timeline: createElement("section", { className: "workspace-timeline-view" }, "timeline")
    }))

    expect(html).toContain("week")
    expect(html).not.toContain("day</section>")
    expect(html).not.toContain("workspace-timeline-view")
  })
})
