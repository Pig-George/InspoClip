import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { describe, expect, test } from "vitest"

const stylesheet = readFileSync(
  fileURLToPath(new URL("./workspace-timeline.css", import.meta.url)),
  "utf8"
)
const tokens = readFileSync(
  fileURLToPath(new URL("./workspace-tokens.css", import.meta.url)),
  "utf8"
)
const fonts = readFileSync(
  fileURLToPath(new URL("../fonts.ts", import.meta.url)),
  "utf8"
)

describe("workspace header visual contract", () => {
  test("uses the desktop client typography in the shared header", () => {
    expect(stylesheet).toMatch(/\.workspace-header-heading h1\s*\{[^}]*font-family:\s*"Caveat",\s*"Gaegu",\s*cursive;/s)
    expect(stylesheet).toMatch(/\.workspace-header-heading h1\s*\{[^}]*font-size:\s*24px;/s)
    expect(stylesheet).toMatch(/\.workspace-header-heading p\s*\{[^}]*font-family:\s*"Gaegu",\s*"Caveat",\s*"Kalam",\s*cursive;/s)
    expect(stylesheet).toMatch(/\.workspace-header-heading p\s*\{[^}]*font-size:\s*14px;/s)
    expect(stylesheet).toMatch(/\.workspace-language-button\s*\{[^}]*font-family:\s*"Caveat",\s*"Gaegu",\s*cursive;[^}]*font-size:\s*12px;[^}]*font-weight:\s*600;/s)
  })

  test("matches the desktop client icon scale for each header control group", () => {
    expect(stylesheet).toMatch(/\.workspace-header-left\s*>\s*\.workspace-icon-button svg\s*\{[^}]*width:\s*24px;[^}]*height:\s*24px;/s)
    expect(stylesheet).toMatch(/\.workspace-view-tabs svg\s*\{[^}]*width:\s*16px;[^}]*height:\s*16px;/s)
    expect(stylesheet).toMatch(/\.workspace-header-actions \.workspace-icon-button svg\s*\{[^}]*width:\s*20px;[^}]*height:\s*20px;/s)
  })

  test("matches the desktop client control dimensions", () => {
    expect(stylesheet).toMatch(/\.workspace-header-nav-button\s*\{[^}]*width:\s*40px;[^}]*height:\s*40px;/s)
    expect(stylesheet).toMatch(/\.workspace-language-button\s*\{[^}]*height:\s*24px;[^}]*padding:\s*4px 8px;/s)
    expect(stylesheet).toMatch(/\.workspace-view-tabs\s*\{[^}]*margin-left:\s*4px;[^}]*padding:\s*2px;/s)
    expect(stylesheet).toMatch(/\.workspace-view-tabs button\s*\{[^}]*width:\s*28px;[^}]*height:\s*28px;/s)
  })

  test("centers wrapped header action icons inside their hover targets", () => {
    expect(stylesheet).toMatch(/\.workspace-header-actions \.workspace-icon-button\s*>\s*span:first-child\s*\{[^}]*display:\s*grid;[^}]*place-items:\s*center;[^}]*line-height:\s*0;/s)
  })

  test("keeps the detail overlay contract shared with the client", () => {
    expect(stylesheet).toMatch(/\.workspace-dialog-backdrop\s*\{[^}]*z-index:\s*80;[^}]*padding:\s*16px;[^}]*background:\s*rgba\(0,\s*0,\s*0,\s*\.5\);/s)
    expect(stylesheet).toMatch(/\.workspace-dialog\s*\{[^}]*width:\s*min\(896px,\s*100%\);[^}]*max-height:\s*85vh;/s)
  })

  test("makes prompt action controls independent of host CSS resets", () => {
    const toolbar = readFileSync(
      fileURLToPath(new URL("../components/WorkspacePromptToolbar.tsx", import.meta.url)),
      "utf8"
    )

    expect(toolbar).toContain('className="workspace-prompt-action-button"')
    expect(toolbar).not.toContain("animate-spin")
    expect(stylesheet).toMatch(/\.workspace-prompt-action-button\s*\{[^}]*border:\s*0;[^}]*background:\s*transparent;/s)
    expect(stylesheet).toMatch(/\.workspace-prompt-action-spinner\s*\{[^}]*animation:\s*workspace-spin 780ms linear infinite;/s)
  })

  test("matches the legacy client prompt card contract", () => {
    expect(stylesheet).toMatch(/\.workspace-prompt-card\s*\{[^}]*padding:\s*12px;[^}]*gap:\s*8px;[^}]*border:\s*1px solid color-mix\(in srgb, var\(--accent\) 20%, transparent\);[^}]*border-radius:\s*8px;/s)
    expect(stylesheet).toMatch(/\.workspace-prompt-text\s*\{[^}]*font-family:\s*"Gaegu",\s*"Caveat",\s*"Kalam",\s*cursive;[^}]*font-size:\s*14px;[^}]*line-height:\s*1\.625;/s)
    expect(stylesheet).toMatch(/\.workspace-prompt-toolbar\s*\{[^}]*gap:\s*8px;[^}]*margin-bottom:\s*0;/s)
    expect(stylesheet).toMatch(/\.workspace-prompt-generate[^}]*border:\s*0;[^}]*border-radius:\s*999px;[^}]*font-size:\s*12px;/s)
    expect(stylesheet).toMatch(/\.workspace-prompt-loading\s*\{[^}]*font-size:\s*14px;/s)
  })

  test("defines the same global typography and paper background for both builds", () => {
    expect(fonts).toContain('import "@fontsource/caveat/latin-400.css"')
    expect(fonts).toContain('import "@fontsource/gaegu/latin-400.css"')
    expect(fonts).toContain('import "@fontsource/kalam/latin-400.css"')
    expect(tokens).toMatch(/body\s*\{[^}]*background-image:[^}]*linear-gradient\(180deg,\s*#faf3e6\s*0%,\s*#f5e8d5\s*50%,\s*#faf3e6\s*100%\);/s)
  })

  test("keeps the day footer outside the scrolling content area", () => {
    expect(stylesheet).toMatch(/\.client-day-column\s*\{[^}]*overflow-x:\s*hidden;[^}]*overflow-y:\s*hidden;/s)
    expect(stylesheet).toMatch(/\.client-day-column-content\s*\{[^}]*flex:\s*1 1 0;[^}]*overflow-y:\s*auto;/s)
    expect(stylesheet).toMatch(/\.workspace-day-footer\s*\{[^}]*flex:\s*0 0 auto;/s)
  })

  test("matches the legacy client day column height and prompt spacing", () => {
    expect(stylesheet).toMatch(/\.client-day-column-day\s*\{[^}]*height:\s*calc\(100vh - 250px\);[^}]*max-height:\s*calc\(100vh - 250px\);/s)
    expect(stylesheet).toMatch(/\.client-day-column-week\s*\{[^}]*height:\s*calc\(100vh - 280px\);[^}]*max-height:\s*calc\(100vh - 280px\);/s)
    expect(stylesheet).toMatch(/\.workspace-replication-prompt-controls\s*\{[^}]*background:\s*transparent;/s)
    expect(stylesheet).toMatch(/\.workspace-prompt-card\s*\{[^}]*background:\s*transparent;/s)
    expect(stylesheet).toMatch(/\.workspace-replication-prompt-panel\s*>\s*\.workspace-prompt-result\s*\{[^}]*margin-top:\s*12px;/s)
  })

  test("keeps prompt action buttons and icons at the legacy scale", () => {
    expect(stylesheet).toMatch(/\.workspace-prompt-actions\s*>\s*button\s*\{[^}]*width:\s*22px;[^}]*height:\s*22px;[^}]*padding:\s*4px;/s)
    expect(stylesheet).toMatch(/\.workspace-prompt-actions\s*>\s*button\s+svg\s*\{[^}]*width:\s*14px;[^}]*height:\s*14px;/s)
  })

  test("keeps the primary card tag free of a filled background", () => {
    expect(stylesheet).toMatch(/\.workspace-card-primary-tag\s*\{[^}]*background:\s*transparent;/s)
    expect(stylesheet).toMatch(/\.workspace-card-primary-tag\s*\{[^}]*background-color:\s*transparent;/s)
    expect(stylesheet).toMatch(/\.workspace-card-primary-tag\s*\{[^}]*background-image:\s*none;/s)
  })

  test("constrains the design-term copied icon and its SVG", () => {
    expect(stylesheet).toMatch(/\.workspace-design-term-check\s*\{[^}]*width:\s*12px;[^}]*height:\s*12px;[^}]*display:\s*inline-flex;[^}]*flex:\s*0 0 auto;/s)
    expect(stylesheet).toMatch(/\.workspace-design-term-check\s+svg\s*\{[^}]*width:\s*12px;[^}]*height:\s*12px;/s)
  })

  test("keeps the tag picker fully opaque", () => {
    expect(stylesheet).toMatch(/\.workspace-tag-editor\s+\.workspace-tag-editor-picker\s*\{[^}]*background:\s*#fdf7ef\s*!important;[^}]*background-color:\s*#fdf7ef\s*!important;[^}]*background-image:\s*none\s*!important;[^}]*opacity:\s*1\s*!important;[^}]*backdrop-filter:\s*none\s*!important;[^}]*filter:\s*none\s*!important;[^}]*mix-blend-mode:\s*normal;[^}]*isolation:\s*isolate;/s)
    expect(stylesheet).toMatch(/:root\.dark\s+\.workspace-tag-editor\s+\.workspace-tag-editor-picker,\s*:root\.timeline-dark\s+\.workspace-tag-editor\s+\.workspace-tag-editor-picker\s*\{[^}]*background:\s*#2a2218\s*!important;/s)
  })

  test("raises the detail section containing the tag picker above adjacent sections", () => {
    expect(stylesheet).toMatch(/\.workspace-detail-section:has\(\.workspace-tag-editor\)\s*\{[^}]*position:\s*relative;[^}]*z-index:\s*30;/s)
  })

  test("centers the tag chip close icon inside its hover target", () => {
    expect(stylesheet).toMatch(/\.workspace-tag-editor-chip\s+button\s*\{[^}]*width:\s*14px;[^}]*height:\s*14px;[^}]*flex:\s*0\s+0\s+14px;[^}]*display:\s*inline-flex;[^}]*align-items:\s*center;[^}]*justify-content:\s*center;[^}]*font-family:\s*inherit;[^}]*line-height:\s*1;[^}]*text-align:\s*center;/s)
  })
})
