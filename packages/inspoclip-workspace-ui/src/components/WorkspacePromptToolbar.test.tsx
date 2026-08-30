import React, { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, test } from "vitest"

import { WorkspacePromptToolbar } from "./WorkspacePromptToolbar"

Object.assign(globalThis, { React })

describe("WorkspacePromptToolbar", () => {
  test("renders the shared language and action controls", () => {
    const html = renderToStaticMarkup(createElement(WorkspacePromptToolbar, {
      language: "both",
      onLanguageChange: () => undefined,
      onCopy: () => undefined,
      onRegenerate: () => undefined,
      copyState: false,
      generating: false,
      labels: { auto: "Auto", en: "EN", zh: "中", both: "EN/中", copy: "Copy", regenerate: "Regenerate" },
      icons: { copy: createElement("span", null, "copy"), regenerate: createElement("span", null, "refresh") }
    }))

    expect(html).toContain("workspace-prompt-toolbar")
    expect(html).toContain("workspace-prompt-languages")
    expect(html).toContain("EN/中")
    expect(html).toContain("refresh")
  })

  test("uses shared spinner classes without host-only utility classes", () => {
    const html = renderToStaticMarkup(createElement(WorkspacePromptToolbar, {
      language: "auto",
      onLanguageChange: () => undefined,
      onRegenerate: () => undefined,
      generating: true,
      labels: { auto: "Auto", en: "EN", zh: "中", both: "EN/中", copy: "Copy", regenerate: "Regenerate" },
      icons: { copy: createElement("i"), regenerate: createElement("i") }
    }))

    expect(html).toContain('class="is-spinning"')
    expect(html).toContain("workspace-prompt-action-spinner")
    expect(html).not.toContain("animate-spin")
  })
})
