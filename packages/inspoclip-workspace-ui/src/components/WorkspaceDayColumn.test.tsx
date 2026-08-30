import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, test } from "vitest"

import { WorkspaceDayColumn } from "./WorkspaceDayColumn"

describe("WorkspaceDayColumn", () => {
  test("renders the shared day shell, header, content and footer", () => {
    const html = renderToStaticMarkup(createElement(WorkspaceDayColumn, {
      isoDate: "2026-08-08",
      weekdayLabel: "Sat",
      dateLabel: "Aug 8",
      count: 2,
      isToday: true,
      todayLabel: "Today",
      children: createElement("div", { "data-testid": "content" }, "Content"),
      footer: createElement("footer", null, "Upload")
    }))

    expect(html).toContain('data-date="2026-08-08"')
    expect(html).toContain('class="workspace-day-column is-today"')
    expect(html).toContain("Sat")
    expect(html).toContain("Aug 8")
    expect(html).toContain("Content")
    expect(html).toContain("Upload")
  })
})
