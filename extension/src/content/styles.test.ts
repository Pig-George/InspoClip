import { describe, expect, test } from "vitest"

import { getContentStyles } from "./styles"

describe("content styles", () => {
  test("shrinks the recording overlay so it cannot cover the page hit area", () => {
    const styles = getContentStyles()
    const recordingRule = styles.match(/\.inspoclip-area-overlay-recording\s*\{([^}]*)\}/)?.[1] || ""

    expect(recordingRule).toContain("pointer-events: none")
    expect(recordingRule).toContain("width: 0")
    expect(recordingRule).toContain("height: 0")
    expect(recordingRule).toContain("overflow: visible")
  })

  test("styles area toolbar actions as compact icon buttons with accessible tooltips", () => {
    const styles = getContentStyles()
    const iconRule = styles.match(/\.inspoclip-area-icon-button,\s*\.inspoclip-area-icon-status\s*\{([^}]*)\}/s)?.[1] || ""

    expect(iconRule).toMatch(/width:\s*32px;/)
    expect(iconRule).toMatch(/height:\s*32px;/)
    expect(styles).toContain('.inspoclip-area-icon-button svg')
    expect(styles).toContain('[data-tooltip]::after')
    expect(styles).toContain('[data-tooltip]:hover::after')
    expect(styles).toContain('[data-tooltip]:focus-visible::after')
  })

  test("anchors the toolbar pointer near the right-aligned selection edge", () => {
    const styles = getContentStyles()
    const pointerRule = styles.match(/\.inspoclip-area-toolbar::before\s*\{([^}]*)\}/s)?.[1] || ""

    expect(pointerRule).toMatch(/right:\s*17px;/)
    expect(pointerRule).not.toMatch(/left:\s*50%;/)
  })

  test("defines the confirmed toolbar motion language and reduced-motion fallback", () => {
    const styles = getContentStyles()

    expect(styles).toContain('@keyframes inspoclip-area-dock-arrive')
    expect(styles).toContain('@keyframes inspoclip-area-sound-ring')
    expect(styles).toContain('@keyframes inspoclip-record-breathe')
    expect(styles).toContain('@keyframes inspoclip-retake-confirm')
    expect(styles).toContain('@keyframes inspoclip-complete-bounce')
    expect(styles).toContain('@keyframes inspoclip-retake-turn')
    expect(styles).toContain('@media (prefers-reduced-motion: reduce)')
  })
})
