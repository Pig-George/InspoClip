import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, test } from "vitest"

import { WorkspaceCardDecoration, type WorkspaceCardDecorationType } from "./WorkspaceCardDecoration"

describe("WorkspaceCardDecoration", () => {
  test("renders every desktop scrapbook decoration through one shared component", () => {
    const types: WorkspaceCardDecorationType[] = ["tape", "pin", "clip", "washi", "stitch", "staple", "sticker", "corner"]

    for (const type of types) {
      const html = renderToStaticMarkup(createElement(WorkspaceCardDecoration, { type }))
      expect(html).toContain(`data-workspace-decoration="${type}"`)
      expect(html).toContain(`workspace-card-decoration-${type}`)
    }
  })
})
