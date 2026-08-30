import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, test } from "vitest"

import { WorkspacePromptOutput } from "./WorkspacePromptOutput"

describe("WorkspacePromptOutput", () => {
  test("shares prompt toolbar and content layout", () => {
    const html = renderToStaticMarkup(createElement(WorkspacePromptOutput, {
      language: "en",
      onLanguageChange: () => undefined,
      onCopy: () => undefined,
      onRegenerate: () => undefined,
      labels: { auto: "Auto", en: "EN", zh: "中", both: "EN/中", copy: "Copy", regenerate: "Regenerate" },
      icons: { copy: createElement("i"), regenerate: createElement("i") },
      contentEn: "Build a card",
      showEn: true,
      showZh: false
    }))

    expect(html).toContain('class="workspace-prompt-output"')
    expect(html).toContain("workspace-prompt-toolbar")
    expect(html).toContain("workspace-prompt-card")
    expect(html).toContain("Build a card")
  })
})
