import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, test } from "vitest"

import { WorkspaceCardCaption } from "./WorkspaceCardCaption"

describe("WorkspaceCardCaption", () => {
  test("renders title, subtitle and all supplied tags", () => {
    const html = renderToStaticMarkup(createElement(WorkspaceCardCaption, {
      title: "Card expansion",
      subtitle: "Analysis complete",
      tags: ["motion", "spring"],
      className: "workspace-card-copy",
      tagsClassName: "workspace-card-tags"
    }))

    expect(html).toContain("Card expansion")
    expect(html).toContain("Analysis complete")
    expect(html).toContain("motion")
    expect(html).toContain("spring")
    expect(html).toContain('class="workspace-card-copy inspoclip-card-caption"')
  })

  test("does not render an empty tag container", () => {
    const html = renderToStaticMarkup(createElement(WorkspaceCardCaption, {
      title: "Image",
      subtitle: "Pending"
    }))

    expect(html).not.toContain("workspace-card-tags")
  })
})
