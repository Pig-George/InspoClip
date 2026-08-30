import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, test } from "vitest"

import { WorkspaceConfirmDialog } from "./WorkspaceConfirmDialog"

describe("WorkspaceConfirmDialog", () => {
  test("renders a reusable destructive confirmation layout", () => {
    const html = renderToStaticMarkup(createElement(WorkspaceConfirmDialog, {
      title: "Confirm deletion",
      description: "This cannot be undone.",
      cancelLabel: "Cancel",
      confirmLabel: "Delete",
      icon: createElement("i", { className: "warning-icon" }),
      onCancel: () => undefined,
      onConfirm: () => undefined
    }))

    expect(html).toContain("workspace-confirm-backdrop")
    expect(html).toContain("workspace-confirm-dialog")
    expect(html).toContain("warning-icon")
    expect(html).toContain("Confirm deletion")
    expect(html).toContain("Delete")
  })

  test("uses a disabled confirmation action while a request is pending", () => {
    const html = renderToStaticMarkup(createElement(WorkspaceConfirmDialog, {
      title: "Confirm deletion",
      description: "This cannot be undone.",
      cancelLabel: "Cancel",
      confirmLabel: "Deleting...",
      onCancel: () => undefined,
      onConfirm: () => undefined,
      pending: true
    }))

    expect(html).toContain("disabled=\"\"")
    expect(html).toContain("Deleting...")
  })
})
