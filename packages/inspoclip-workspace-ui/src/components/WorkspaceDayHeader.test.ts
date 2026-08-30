import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, test } from "vitest"

import { WorkspaceDayHeader } from "./WorkspaceDayHeader"

describe("WorkspaceDayHeader", () => {
  test("renders localized date information, today badge and count", () => {
    const html = renderToStaticMarkup(createElement(WorkspaceDayHeader, {
      weekdayLabel: "周一",
      dateLabel: "8月10日",
      count: 3,
      isToday: true,
      todayLabel: "今天",
      className: "day-header"
    }))

    expect(html).toContain("周一")
    expect(html).toContain("8月10日")
    expect(html).toContain("今天")
    expect(html).toContain(">3</span>")
    expect(html).toContain('class="day-header"')
  })

  test("omits optional date and today badge when unavailable", () => {
    const html = renderToStaticMarkup(renderHeader())

    expect(html).toContain("Tuesday")
    expect(html).not.toContain("Today")
    expect(html).not.toContain("date-label")
  })
})

function renderHeader() {
  return createElement(WorkspaceDayHeader, {
    weekdayLabel: "Tuesday",
    count: 0,
    dateClassName: "date-label"
  })
}
