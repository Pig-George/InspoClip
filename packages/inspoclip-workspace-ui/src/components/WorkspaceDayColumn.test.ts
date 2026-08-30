import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, test } from "vitest"

import { WorkspaceDayColumn } from "./WorkspaceDayColumn"

describe("WorkspaceDayColumn", () => {
  test("keeps the shared layout class when a consumer adds custom classes", () => {
    const html = renderToStaticMarkup(createElement(WorkspaceDayColumn, {
      className: "client-day-column client-day-column-day",
      weekdayLabel: "Monday",
      dateLabel: "Aug 10",
      count: 2,
      children: createElement("span", null, "Content")
    }))

    expect(html).toContain('class="workspace-day-column client-day-column client-day-column-day"')
  })

  test("renders the footer after scrollable content so it can stay fixed", () => {
    const html = renderToStaticMarkup(createElement(WorkspaceDayColumn, {
      className: "client-day-column",
      children: createElement("div", null, "Cards"),
      footer: createElement("footer", { "data-testid": "day-footer" }, "Upload")
    }))

    const contentIndex = html.indexOf("Cards")
    const footerIndex = html.indexOf('data-testid="day-footer"')
    expect(contentIndex).toBeGreaterThan(-1)
    expect(footerIndex).toBeGreaterThan(contentIndex)
    expect(html).toMatch(/<div class="workspace-day-content">[\s\S]*<\/div><div class="workspace-day-footer">/)
  })
})
