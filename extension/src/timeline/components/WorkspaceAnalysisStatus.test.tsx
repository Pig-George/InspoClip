import React, { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, test } from "vitest"

import { WorkspaceAnalysisStatus } from "./WorkspaceAnalysisStatus"

Object.assign(globalThis, { React })

describe("WorkspaceAnalysisStatus", () => {
  test("renders a floating status while an asset is being analyzed", () => {
    const html = renderToStaticMarkup(createElement(WorkspaceAnalysisStatus, { label: "Uploading and analyzing...", completed: 0, total: 1 }))
    expect(html).toContain('role="status"')
    expect(html).toContain("workspace-analysis-status-spinner")
    expect(html).toContain("Uploading and analyzing...")
    expect(html).not.toContain("0/1")
  })

  test("shows batch progress when multiple assets are queued", () => {
    const html = renderToStaticMarkup(createElement(WorkspaceAnalysisStatus, { label: "Uploading and analyzing...", completed: 1, total: 3 }))
    expect(html).toContain("1/3")
  })
})
