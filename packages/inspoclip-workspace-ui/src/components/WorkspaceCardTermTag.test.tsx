import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, test } from "vitest"

import { WorkspaceCardTermTag } from "./WorkspaceCardTermTag"

describe("WorkspaceCardTermTag", () => {
  test("renders the bilingual desktop card label and remaining count", () => {
    const html = renderToStaticMarkup(createElement(WorkspaceCardTermTag, { en: "neutral palette", zh: "中性色调", remaining: 7 }))
    expect(html).toContain("workspace-card-primary-tag")
    expect(html).toContain("neutral palette")
    expect(html).toContain("中性色调")
    expect(html).toContain("+7")
  })
})
