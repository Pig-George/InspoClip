import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, test } from "vitest"

import { WorkspaceDetailSection } from "./WorkspaceDetailSection"

describe("WorkspaceDetailSection", () => {
  test("renders a titled section with consumer content and classes", () => {
    const html = renderToStaticMarkup(createElement(WorkspaceDetailSection, {
      title: "Stage analysis",
      className: "workspace-detail-section",
      headingClassName: "detail-heading",
      children: createElement("p", null, "First stage")
    }))

    expect(html).toContain('class="workspace-detail-section"')
    expect(html).toContain('<h3 class="detail-heading">Stage analysis</h3>')
    expect(html).toContain("First stage")
  })

  test("uses the shared detail section classes by default", () => {
    const html = renderToStaticMarkup(createElement(WorkspaceDetailSection, {
      title: "Overview",
      children: createElement("p", null, "Summary")
    }))

    expect(html).toContain('class="workspace-detail-section workspace-detail-enter"')
    expect(html).toContain('<h3 class="workspace-detail-heading">Overview</h3>')
  })
})
