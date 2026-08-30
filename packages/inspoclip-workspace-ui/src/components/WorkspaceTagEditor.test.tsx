import React, { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, test } from "vitest"

import { WorkspaceTagEditor } from "./WorkspaceTagEditor"

Object.assign(globalThis, { React })

describe("WorkspaceTagEditor", () => {
  test("renders tags and an accessible add control", () => {
    const html = renderToStaticMarkup(createElement(WorkspaceTagEditor, {
      tags: [{ id: "motion", label: "Motion", color: "#f97316" }],
      labels: { add: "Add tag", remove: "Remove" },
      onAdd: () => undefined,
      onRemove: () => undefined
    }))

    expect(html).toContain("workspace-tag-editor")
    expect(html).toContain("Motion")
    expect(html).toContain("Add tag")
  })
})
