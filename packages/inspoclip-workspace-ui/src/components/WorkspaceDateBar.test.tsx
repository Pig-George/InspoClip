import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, test, vi } from "vitest"

import { WorkspaceDateBar } from "./WorkspaceDateBar"

describe("WorkspaceDateBar", () => {
  test("renders controls, active date and selectable dots", () => {
    const html = renderToStaticMarkup(createElement(WorkspaceDateBar, {
      days: [
        { isoDate: "2026-08-07", date: new Date("2026-08-07T00:00:00"), isToday: false },
        { isoDate: "2026-08-08", date: new Date("2026-08-08T00:00:00"), isToday: true }
      ],
      activeIndex: 1,
      labels: { today: "Today", previous: "Previous", next: "Next" },
      onPrevious: vi.fn(),
      onToday: vi.fn(),
      onNext: vi.fn(),
      onSelect: vi.fn()
    }))

    expect(html).toContain("Today")
    expect(html).toContain('aria-label="Previous"')
    expect(html).toContain('aria-label="Next"')
    expect(html).toContain('data-date="2026-08-08"')
    expect(html).toContain('class="is-active"')
  })
})
