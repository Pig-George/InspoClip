import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, test } from "vitest"

import { WorkspaceDetailSaveAction } from "./WorkspaceDetailSaveAction"

describe("WorkspaceDetailSaveAction", () => {
  test("renders an actionable save button for a draft asset", () => {
    const html = renderToStaticMarkup(createElement(WorkspaceDetailSaveAction, {
      saved: false,
      saveLabel: "Save to InspoClip",
      savedLabel: "Saved",
      saveIcon: createElement("i", { className: "save-icon" }),
      onSave: () => undefined
    }))

    expect(html).toContain("workspace-detail-save")
    expect(html).toContain("Save to InspoClip")
    expect(html).toContain("save-icon")
    expect(html).not.toContain("is-saved")
  })

  test("renders a passive saved state after persistence", () => {
    const html = renderToStaticMarkup(createElement(WorkspaceDetailSaveAction, {
      saved: true,
      saveLabel: "Save to InspoClip",
      savedLabel: "Saved",
      savedIcon: createElement("i", { className: "saved-icon" })
    }))

    expect(html).toContain("workspace-detail-save is-saved")
    expect(html).toContain("Saved")
    expect(html).toContain("saved-icon")
    expect(html).not.toContain("<button")
  })
})
