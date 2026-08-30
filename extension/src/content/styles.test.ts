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

  test("reveals compact labels inside stable toolbar buttons", () => {
    const styles = getContentStyles()
    const iconRule = styles.match(/\.inspoclip-area-icon-button,\s*\.inspoclip-area-icon-status\s*\{([^}]*)\}/s)?.[1] || ""

    expect(iconRule).toMatch(/width:\s*38px;/)
    expect(iconRule).toMatch(/height:\s*38px;/)
    expect(styles).toContain('.inspoclip-area-button-icon')
    expect(styles).toContain('.inspoclip-area-button-label')
    expect(styles).toContain('.inspoclip-area-icon-button:hover .inspoclip-area-button-icon')
    expect(styles).toContain('.inspoclip-area-icon-button:focus-visible .inspoclip-area-button-label')
    expect(styles).toMatch(/translateY\(-6px\)\s*scale\(0\.76\)/)
    expect(styles).not.toContain('[data-tooltip]::after')
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

  test("uses red foreground for the retake confirmation state", () => {
    const styles = getContentStyles()
    const confirmRule = styles.match(/\.inspoclip-area-action-confirm\s*\{([^}]*)\}/s)?.[1] || ""

    expect(confirmRule).toMatch(/color:\s*#c43d32;/)
    expect(confirmRule).not.toMatch(/color:\s*#fff;/)
  })

  test("turns the recording indicator gray and stops breathing while paused", () => {
    const styles = getContentStyles()
    const pausedDotRule = styles.match(/\.inspoclip-area-overlay-paused\s+\.inspoclip-area-record-dot\s*\{([^}]*)\}/s)?.[1] || ""

    expect(pausedDotRule).toMatch(/background:\s*#9b938d;/)
    expect(pausedDotRule).toMatch(/animation:\s*none;/)
  })

  test("renders the recording audio status as visibly disabled", () => {
    const styles = getContentStyles()
    const disabledRule = styles.match(/\.inspoclip-area-icon-status-disabled\s*\{([^}]*)\}/s)?.[1] || ""

    expect(disabledRule).toMatch(/background:\s*#f0ece8;/)
    expect(disabledRule).toMatch(/color:\s*#9b938d;/)
    expect(disabledRule).toMatch(/cursor:\s*not-allowed;/)
    expect(disabledRule).toMatch(/opacity:\s*0\.72;/)
  })

  test("scales toolbar buttons in with a staggered entrance animation", () => {
    const styles = getContentStyles()
    const entranceRule = styles.match(/\.inspoclip-area-control-enter\s*\{([^}]*)\}/s)?.[1] || ""

    expect(entranceRule).toContain("inspoclip-area-control-enter")
    expect(entranceRule).toContain("var(--inspoclip-area-control-enter-delay, 0ms)")
    expect(styles).toContain("@keyframes inspoclip-area-control-enter")
    expect(styles).toMatch(/from\s*\{[^}]*scale\(0\.64\)/s)
    expect(styles).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*animation-delay:\s*0ms !important;/)
  })

  test("renders loading messages with circular progress rings", () => {
    const styles = getContentStyles()

    expect(styles).toContain(".inspoclip-progress-ring")
    expect(styles).toContain(".inspoclip-progress-ring-determinate")
    expect(styles).toContain(".inspoclip-progress-ring-track")
    expect(styles).toContain(".inspoclip-progress-ring-value")
    expect(styles).toMatch(/stroke-dashoffset\s+0\.38s/)
    expect(styles).toContain("@keyframes inspoclip-toast-char-jump")
    expect(styles).toContain("--inspoclip-toast-char-index")
    expect(styles).not.toContain("conic-gradient")
    expect(styles).not.toContain(".inspoclip-spinner")
  })

  test("overlaps progress cards and smoothly expands them with a stable interaction state", () => {
    const styles = getContentStyles()

    expect(styles).toContain(".inspoclip-analysis-stack")
    expect(styles).toMatch(/\.inspoclip-analysis-stack\s*\{[^}]*flex-direction:\s*column/s)
    expect(styles).toMatch(/\.inspoclip-analysis-stack\s*\{[^}]*gap:\s*0/s)
    expect(styles).toMatch(/\.inspoclip-analysis-stack\s*\{[^}]*width:\s*fit-content/s)
    expect(styles).toMatch(/\.inspoclip-analysis-stack\s*\{[^}]*max-width:\s*calc\(100vw - 40px\)/s)
    expect(styles).toMatch(/\.inspoclip-analysis-stack \.inspoclip-toast \+ \.inspoclip-toast\s*\{[^}]*margin-top:\s*-32px/s)
    expect(styles).toMatch(/\.inspoclip-analysis-stack\.is-expanded \.inspoclip-toast \+ \.inspoclip-toast[\s\S]*margin-top:\s*8px/s)
    expect(styles).not.toContain(".inspoclip-analysis-stack-summary")
    expect(styles).toMatch(/\.inspoclip-analysis-stack \.inspoclip-toast\s*\{[^}]*position:\s*relative\s*!important/s)
    expect(styles).toMatch(/\.inspoclip-analysis-stack\s*\{[^}]*align-items:\s*center/s)
    expect(styles).toMatch(/\.inspoclip-analysis-stack \.inspoclip-toast\s*\{[^}]*align-self:\s*center/s)
    expect(styles).toMatch(/margin-top \.48s cubic-bezier\(\.22,\.8,\.24,1\)/)
    expect(styles).toMatch(/box-shadow \.48s cubic-bezier\(\.22,\.8,\.24,1\)/)
    expect(styles).toContain("scale(var(--inspoclip-analysis-stack-scale, 1))")
    expect(styles).toMatch(/\.inspoclip-analysis-stack\.is-expanded \.inspoclip-toast\.inspoclip-toast-visible[\s\S]*scale\(1\)/)
    expect(styles).toContain("cubic-bezier(.22,.8,.24,1)")
  })

  test("restores the original loading text animation timing", () => {
    const styles = getContentStyles()

    expect(styles).toMatch(/inspoclip-toast-char-jump 1\.5s ease-in-out infinite/)
    expect(styles).toContain("--inspoclip-toast-char-index) * 50ms")
    expect(styles).toMatch(/9%\s*\{[^}]*translateY\(-2\.5px\)/s)
  })

  test("supports an interactive full-size image preview", () => {
    const styles = getContentStyles()

    expect(styles).toMatch(/\.inspoclip-preview img\s*\{[^}]*cursor:\s*zoom-in/s)
    expect(styles).toContain(".inspoclip-image-lightbox")
    expect(styles).toMatch(/\.inspoclip-image-lightbox\s*\{[^}]*z-index:\s*2147483647/s)
    expect(styles).toMatch(/\.inspoclip-image-lightbox img\s*\{[^}]*object-fit:\s*contain/s)
  })

  test("lets saved primary actions release footer spacing without a layout jump", () => {
    const styles = getContentStyles()
    const footerRule = styles.match(/\.inspoclip-modal-footer\s*\{([^}]*)\}/s)?.[1] || ""
    const footerActionRule = styles.match(/\.inspoclip-modal-footer \.inspoclip-btn\s*\{([^}]*)\}/s)?.[1] || ""

    expect(footerRule).toMatch(/gap:\s*0;/)
    expect(footerActionRule).toMatch(/margin:\s*0 4px;/)
  })

  test("aligns in-page detail controls with shared workspace buttons", () => {
    const styles = getContentStyles()
    const iconRule = styles.match(/\.inspoclip-copy-all\s*\{([^}]*)\}/s)?.[1] || ""
    const iconHoverRule = styles.match(/\.inspoclip-copy-all:hover:not\(:disabled\)\s*\{([^}]*)\}/s)?.[1] || ""
    const languageGroupRule = styles.match(/\.inspoclip-lang-group\s*\{([^}]*)\}/s)?.[1] || ""
    const languageRule = styles.match(/\.inspoclip-lang-btn\s*\{([^}]*)\}/s)?.[1] || ""
    const languageActiveRule = styles.match(/\.inspoclip-lang-btn\.active\s*\{([^}]*)\}/s)?.[1] || ""

    expect(iconRule).toMatch(/width:\s*22px;/)
    expect(iconRule).toMatch(/height:\s*22px;/)
    expect(iconRule).toMatch(/border:\s*0;/)
    expect(iconRule).toMatch(/border-radius:\s*4px;/)
    expect(iconRule).toMatch(/background:\s*transparent;/)
    expect(iconRule).toMatch(/color:\s*var\(--text-muted\);/)
    expect(iconHoverRule).toMatch(/background:\s*var\(--muted\);/)
    expect(iconHoverRule).not.toMatch(/border-color:/)

    expect(languageGroupRule).toMatch(/padding:\s*2px;/)
    expect(languageGroupRule).toMatch(/border-radius:\s*6px;/)
    expect(languageGroupRule).toMatch(/background:\s*color-mix\(in srgb, var\(--muted\) 84%, transparent\);/)
    expect(languageRule).toMatch(/min-width:\s*0;/)
    expect(languageRule).toMatch(/height:\s*auto;/)
    expect(languageRule).toMatch(/padding:\s*2px 6px;/)
    expect(languageRule).toMatch(/font-size:\s*10px;/)
    expect(languageRule).toMatch(/line-height:\s*14px;/)
    expect(languageRule).toMatch(/border-radius:\s*4px;/)
    expect(languageActiveRule).toMatch(/background:\s*var\(--card\);/)
    expect(languageActiveRule).toMatch(/color:\s*var\(--accent\);/)

    const purposeGroupRule = styles.match(/\.inspoclip-video-purpose-group\s*\{([^}]*)\}/s)?.[1] || ""
    const purposeRule = styles.match(/\.inspoclip-video-purpose-btn\s*\{([^}]*)\}/s)?.[1] || ""
    const purposeActiveRule = styles.match(/\.inspoclip-video-purpose-btn\.active\s*\{([^}]*)\}/s)?.[1] || ""
    const generateRule = styles.match(/\.inspoclip-video-prompt-generate\s*\{([^}]*)\}/s)?.[1] || ""
    const sectionRule = styles.match(/\.inspoclip-video-prompt-section\s*\{([^}]*)\}/s)?.[1] || ""

    expect(purposeGroupRule).toMatch(/display:\s*flex;/)
    expect(purposeGroupRule).toMatch(/flex-wrap:\s*wrap;/)
    expect(purposeRule).toMatch(/border:\s*1px solid #e2c9a8;/)
    expect(purposeRule).toMatch(/border-radius:\s*999px;/)
    expect(purposeRule).toMatch(/background:\s*#fff8ef;/)
    expect(purposeActiveRule).toMatch(/background:\s*#c0784a;/)
    expect(purposeActiveRule).toMatch(/color:\s*#fff;/)
    expect(generateRule).toMatch(/min-height:\s*26px;/)
    expect(generateRule).toMatch(/padding:\s*6px 10px;/)
    expect(sectionRule).toMatch(/background:\s*linear-gradient\(135deg, #fffaf2, #f7ead6\);/)
    expect(sectionRule).toMatch(/border:\s*1px solid #ead8ba;/)
    expect(sectionRule).toMatch(/border-radius:\s*14px;/)

    const stageRule = styles.match(/\.inspoclip-video-stage\s*\{([^}]*)\}/s)?.[1] || ""
    const stageTitleRule = styles.match(/\.inspoclip-video-stage-head\s*\{([^}]*)\}/s)?.[1] || ""
    const stageTimeRule = styles.match(/\.inspoclip-video-stage-head em\s*\{([^}]*)\}/s)?.[1] || ""

    expect(stageRule).toMatch(/padding:\s*10px;/)
    expect(stageRule).toMatch(/border:\s*1px solid #ead8ba;/)
    expect(stageRule).toMatch(/border-radius:\s*12px;/)
    expect(stageRule).toMatch(/background:\s*linear-gradient\(135deg, #fffaf2, #f7ead6\);/)
    expect(stageTitleRule).toMatch(/font-size:\s*12px;/)
    expect(stageTitleRule).toMatch(/font-weight:\s*700;/)
    expect(stageTimeRule).toMatch(/font-size:\s*10px;/)
    expect(stageTimeRule).toMatch(/white-space:\s*nowrap;/)
  })
})
