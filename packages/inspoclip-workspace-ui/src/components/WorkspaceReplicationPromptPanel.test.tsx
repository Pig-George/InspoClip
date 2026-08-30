import React, { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, test, vi } from "vitest"

import { WorkspaceReplicationPromptPanel } from "./WorkspaceReplicationPromptPanel"

Object.assign(globalThis, { React })

const labels = {
  purpose: "Purpose",
  target: "Target platform",
  targetPlaceholder: "Optional target",
  generate: "Generate output",
  generating: "Generating...",
  loading: "Loading..."
}
const purposes = [
  { value: "general", label: "General" },
  { value: "frontend", label: "Frontend" }
]

describe("WorkspaceReplicationPromptPanel", () => {
  test("renders shared purpose controls without host-only wrappers", () => {
    const onPurposeChange = vi.fn()
    const html = renderToStaticMarkup(createElement(WorkspaceReplicationPromptPanel, {
      title: "Replication output",
      description: "Organize prompts by purpose.",
      purposes,
      selectedPurpose: "general",
      onPurposeChange,
      showTarget: false,
      loading: false,
      hasOutput: false,
      labels,
      output: createElement("div", null, "prompt body")
    }))

    expect(html).toContain('workspace-replication-prompt-panel')
    expect(html).toContain('<h3 class="text-xs font-heading uppercase tracking-wide text-[var(--text-muted)]">Replication output</h3>')
    expect(html).toContain('workspace-replication-prompt-description')
    expect(html).toContain(">Purpose</span>")
    expect(html).toContain('workspace-replication-prompt-controls')
    expect(html).toContain("workspace-replication-purpose")
    expect(html).toContain("is-active")
  })

  test("keeps the shared prompt state shell and forwards generation intent", () => {
    const onGenerate = vi.fn()
    const html = renderToStaticMarkup(createElement(WorkspaceReplicationPromptPanel, {
      title: "Replication output",
      purposes,
      selectedPurpose: "general",
      onPurposeChange: () => undefined,
      showTarget: true,
      target: "",
      onTargetChange: () => undefined,
      loading: false,
      hasOutput: false,
      onGenerate,
      labels,
      output: null
    }))

    expect(html).toContain("workspace-prompt-result")
    expect(html).toContain("Generate output")
  })
})
