import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, test } from "vitest"

import { WorkspaceSearchDialog } from "./WorkspaceSearchDialog"

describe("WorkspaceSearchDialog", () => {
  test("renders the shared client search modal structure", () => {
    const html = renderToStaticMarkup(createElement(WorkspaceSearchDialog, {
      value: "motion",
      placeholder: "Search",
      label: "Search",
      closeLabel: "Close",
      inputIcon: "search",
      closeIcon: "close",
      onChange: () => undefined,
      onClose: () => undefined,
      children: createElement("div", null, "result")
    }))

    expect(html).toContain("workspace-search-dialog-backdrop")
    expect(html).toContain("workspace-search-dialog")
    expect(html).toContain("workspace-search-dialog-header")
    expect(html).toContain("workspace-search-results")
  })
})
