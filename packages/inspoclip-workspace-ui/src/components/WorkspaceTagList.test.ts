import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, test } from "vitest"

import { WorkspaceTagList } from "./WorkspaceTagList"

describe("WorkspaceTagList", () => {
  test("renders tags with stable classes and skips empty lists", () => {
    const html = renderToStaticMarkup(createElement(WorkspaceTagList, {
      tags: ["motion", "spring"],
      className: "tags",
      tagClassName: "tag"
    }))
    expect(html).toContain('data-workspace-tag-list="true"')
    expect(html).toContain('class="tag"')
    expect(html).toContain("motion")
    expect(renderToStaticMarkup(createElement(WorkspaceTagList, { tags: [] }))).toBe("")
  })
})
