import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, test } from "vitest"

import { WorkspaceDayBoard } from "./WorkspaceDayBoard"
import type { WorkspaceAsset } from "../model"

describe("WorkspaceDayBoard", () => {
  test("renders shared date controls and supplied day columns", () => {
    const html = renderToStaticMarkup(createElement(WorkspaceDayBoard<WorkspaceAsset>, {
      days: [{ isoDate: "2026-08-08", date: new Date("2026-08-08T00:00:00"), assets: [{ id: "asset-a", kind: "image", createdAt: "2026-08-08T00:00:00.000Z" }], isToday: true }],
      labels: { today: "Today", previous: "Previous", next: "Next", all: "All", ideas: "Ideas" },
      renderColumn: (day) => createElement("article", { "data-day": day.isoDate }, day.assets[0].id),
      notes: createElement("aside", null, "Notes")
    }))
    expect(html).toContain('data-date="2026-08-08"')
    expect(html).toContain("Today")
    expect(html).toContain('data-day="2026-08-08"')
    expect(html).toContain("asset-a")
    expect(html).toContain("Notes")
  })
})
