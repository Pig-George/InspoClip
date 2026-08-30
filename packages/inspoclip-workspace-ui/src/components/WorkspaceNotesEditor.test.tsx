import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, test } from "vitest"

import { WorkspaceNotesEditor } from "./WorkspaceNotesEditor"

describe("WorkspaceNotesEditor", () => {
  test("renders the shared sticky note structure", () => {
    const html = renderToStaticMarkup(createElement(WorkspaceNotesEditor, {
      label: "Notes",
      placeholder: "Write a note",
      content: "Keep this transition",
      onChange: () => undefined,
      onBlur: () => undefined,
      height: 140,
      onResize: () => undefined
    }))

    expect(html).toContain('data-workspace-notes-editor="true"')
    expect(html).toContain("workspace-sticky-note-tape")
    expect(html).toContain("Keep this transition")
    expect(html).toContain("Write a note")
    expect(html).toContain("workspace-sticky-note-resize")
  })
})
