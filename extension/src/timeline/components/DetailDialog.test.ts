import React, { createElement } from "react"
import { readFileSync } from "node:fs"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, test } from "vitest"

import { DetailDialog } from "./DetailDialog"

Object.assign(globalThis, { React })

const base = {
  id: "asset-1",
  kind: "video" as const,
  state: "saved" as const,
  mode: "standalone" as const,
  createdAt: "2026-08-16T00:00:00.000Z",
  updatedAt: "2026-08-16T00:00:00.000Z",
  title: "Demo",
  analysis: { colors: ["#fff"], replicationPrompts: { general: { en: "prompt", zh: "提示词" } } }
}

describe("DetailDialog", () => {
  test("forces a model request for the first video replication prompt", () => {
    const source = readFileSync(new URL("./DetailDialog.tsx", import.meta.url), "utf8")
    expect(source).toContain('onGenerate={() => onGenerate?.(purpose, true)}')
  })

  test("does not render a color palette section for videos", () => {
    const html = renderToStaticMarkup(createElement(DetailDialog, {
      asset: base,
      copyState: false,
      locale: "zh",
      t: {
        subtitle: "", day: "", week: "", timeline: "", today: "", ideas: "", all: "", search: "", refresh: "", loading: "", empty: "", emptyHint: "", image: "", video: "", openDetail: "", close: "", copy: "", copied: "", generatePrompt: "", regeneratePrompt: "", generatingPrompt: "", languageAuto: "Auto", languageEn: "EN", languageZh: "中", languageBoth: "EN/中", replicationTitle: "复刻输出", replicationDescription: "", purposeLabel: "用途", targetLabel: "", targetPlaceholder: "", generateOutput: "生成输出", generatingOutput: "生成中…", uploadAssets: "", uploadHint: "", uploading: "", uploadFailed: "", pasteOrDrop: "", saveAsset: "", saved: "", noPrompt: "", stages: "", colors: "配色方案", terms: "", tags: "标签", overview: "", assets: "", notes: "", notesPlaceholder: "", theme: "", language: "", export: "", previous: "", next: "", noContent: "", previewUnavailable: "", analysisPending: "", analysisFailed: "", unknown: ""
      },
      onClose: () => undefined,
      onCopy: () => undefined,
      onGenerate: () => undefined
    }))

    expect(html).not.toContain("workspace-colors")
    expect(html).toContain("refresh-cw")
    expect(html).toContain("workspace-prompt-result")
    expect(html).toContain("space-y-3 rounded-xl border border-[var(--card-border)] bg-[var(--muted)]/35 p-3")
    expect(html).toContain("rounded-lg px-2.5 py-1.5 text-xs transition-colors bg-[var(--accent)] text-white shadow-sm")
    expect(html).toContain(">用途</span>")
    expect(html).toContain("data-popup-icon=\"refresh-cw\"")
    expect(html).not.toContain('class="workspace-detail-section workspace-prompt workspace-detail-enter"')
    expect(html).toContain('<section class="workspace-detail-section workspace-detail-enter">')
    expect(html).toContain('<h3 class="text-xs font-heading uppercase tracking-wide text-[var(--text-muted)]">复刻输出</h3>')
    expect(html).not.toContain("workspace-detail-save")
  })

  test("uses the develop video dialog layout without image-only sections", () => {
    const html = renderToStaticMarkup(createElement(DetailDialog, {
      asset: {
        ...base,
        analysis: {
          summary: { en: "A compact transition", zh: "紧凑转场" },
          designTerms: ["card / 卡片"],
          replicationPrompts: { general: { en: "prompt", zh: "提示词" } }
        }
      },
      copyState: false,
      locale: "zh",
      t: {
        subtitle: "", day: "", week: "", timeline: "", today: "", ideas: "", all: "", search: "", refresh: "", loading: "", empty: "", emptyHint: "", image: "", video: "", openDetail: "", close: "关闭", copy: "", copied: "", generatePrompt: "", regeneratePrompt: "", generatingPrompt: "", languageAuto: "Auto", languageEn: "EN", languageZh: "中", languageBoth: "EN/中", replicationTitle: "复刻输出", replicationDescription: "", purposeLabel: "用途", targetLabel: "目标平台", targetPlaceholder: "", generateOutput: "生成输出", generatingOutput: "生成中…", uploadAssets: "", uploadHint: "", uploading: "", uploadFailed: "", pasteOrDrop: "", saveAsset: "保存", saved: "已保存", noPrompt: "", stages: "阶段分析", colors: "配色方案", terms: "术语", tags: "标签", overview: "概览", assets: "", notes: "", notesPlaceholder: "", theme: "", language: "", export: "", previous: "", next: "", noContent: "", previewUnavailable: "", analysisPending: "", analysisFailed: "", unknown: ""
      },
      onClose: () => undefined,
      onCopy: () => undefined,
      onGenerate: () => undefined
    }))

    expect(html).toContain("workspace-video-detail-body")
    expect(html).not.toContain(">概览</h3>")
    expect(html).not.toContain(">术语</h3>")
    expect(html).toContain(">阶段分析</h3>")
    const sectionOrder = [
      html.indexOf(">标签</h3>"),
      html.indexOf(">阶段分析</h3>"),
      html.indexOf(">复刻输出</h3>")
    ]
    expect(sectionOrder.every((index) => index >= 0)).toBe(true)
    expect(sectionOrder).toEqual([...sectionOrder].sort((a, b) => a - b))
  })

  test("renders image colors as the same labeled palette items as the client", () => {
    const html = renderToStaticMarkup(createElement(DetailDialog, {
      asset: {
        ...base,
        kind: "image",
        analysis: { colors: ["#f97316", "#0e7490"], prompt: { en: "Prompt", zh: "提示词" } }
      },
      copyState: false,
      locale: "zh",
      t: {
        subtitle: "", day: "", week: "", timeline: "", today: "", ideas: "", all: "", search: "", refresh: "", loading: "", empty: "", emptyHint: "", image: "", video: "", openDetail: "", close: "关闭", copy: "", copied: "", generatePrompt: "", regeneratePrompt: "", generatingPrompt: "", languageAuto: "Auto", languageEn: "EN", languageZh: "中", languageBoth: "EN/中", replicationTitle: "", replicationDescription: "", purposeLabel: "", targetLabel: "", targetPlaceholder: "", generateOutput: "", generatingOutput: "", uploadAssets: "", uploadHint: "", uploading: "", uploadFailed: "", pasteOrDrop: "", saveAsset: "保存", saved: "已保存", noPrompt: "", stages: "", colors: "配色方案", terms: "", tags: "标签", overview: "概览", assets: "", notes: "", notesPlaceholder: "", theme: "", language: "", export: "", previous: "", next: "", noContent: "", previewUnavailable: "", analysisPending: "", analysisFailed: "", unknown: ""
      },
      onClose: () => undefined,
      onCopy: () => undefined,
      onGenerate: () => undefined
    }))

    expect(html).toContain("flex flex-wrap gap-2")
    expect(html).toContain("group flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-[var(--card-border)] hover:border-[var(--accent)] transition-colors")
    expect(html).toContain("w-6 h-6 rounded-md border border-[var(--card-border)]")
    expect(html).toContain("#F97316")
    expect(html).toContain("#0E7490")
  })

  test("matches the client section order for image details", () => {
    const html = renderToStaticMarkup(createElement(DetailDialog, {
      asset: {
        ...base,
        kind: "image",
        analysis: {
          summary: { en: "Summary", zh: "概览" },
          designTerms: ["button / 按钮"],
          colors: ["#f97316"],
          prompt: { en: "Prompt", zh: "提示词" }
        }
      },
      copyState: false,
      locale: "zh",
      t: {
        subtitle: "", day: "", week: "", timeline: "", today: "", ideas: "", all: "", search: "", refresh: "", loading: "", empty: "", emptyHint: "", image: "", video: "", openDetail: "", close: "关闭", copy: "", copied: "", generatePrompt: "", regeneratePrompt: "", generatingPrompt: "", languageAuto: "Auto", languageEn: "EN", languageZh: "中", languageBoth: "EN/中", replicationTitle: "", replicationDescription: "", purposeLabel: "", targetLabel: "", targetPlaceholder: "", generateOutput: "", generatingOutput: "", uploadAssets: "", uploadHint: "", uploading: "", uploadFailed: "", pasteOrDrop: "", saveAsset: "保存", saved: "已保存", noPrompt: "暂无 Prompt", stages: "阶段分析", colors: "配色方案", terms: "设计术语", tags: "标签", overview: "概览", assets: "", notes: "", notesPlaceholder: "", theme: "", language: "", export: "", previous: "", next: "", noContent: "", previewUnavailable: "", analysisPending: "", analysisFailed: "", unknown: ""
      },
      onClose: () => undefined,
      onCopy: () => undefined,
      onGenerate: () => undefined
    }))

    const sectionOrder = [
      html.indexOf(">设计术语</h3>"),
      html.indexOf(">标签</h3>"),
      html.indexOf(">配色方案</h3>"),
      html.indexOf(">AI Prompt</h3>")
    ]
    expect(sectionOrder.every((index) => index >= 0)).toBe(true)
    expect(sectionOrder).toEqual([...sectionOrder].sort((a, b) => a - b))
    expect(html).not.toContain(">概览</h3>")
    expect(html).not.toContain(">阶段分析</h3>")
  })
})
