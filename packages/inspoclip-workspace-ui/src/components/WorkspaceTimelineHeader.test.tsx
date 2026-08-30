import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, test } from "vitest"

import { WorkspaceTimelineHeader } from "./WorkspaceTimelineHeader"

describe("WorkspaceTimelineHeader", () => {
  test("renders the desktop month navigation contract", () => {
    const html = renderToStaticMarkup(createElement(WorkspaceTimelineHeader, {
      title: "August 2026",
      meta: "4 inspirations",
      previousLabel: "Previous month",
      nextLabel: "Next month",
      previousIcon: "left",
      nextIcon: "right",
      canGoNext: false,
      onPrevious: () => undefined,
      onNext: () => undefined
    }))

    expect(html).toContain("workspace-timeline-header")
    expect(html).toContain("workspace-timeline-title")
    expect(html).toContain("workspace-timeline-meta")
    expect(html).toContain("disabled")
  })
})
