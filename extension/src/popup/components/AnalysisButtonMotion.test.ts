import { readFileSync } from "node:fs"
import { describe, expect, test } from "vitest"

const popupCss = readFileSync(new URL("../style.css", import.meta.url), "utf8")

describe("analysis button motion", () => {
  test("keeps the approved fast-slow-fast sheen and lively wand motion", () => {
    expect(popupCss).toContain(".analysis-control::before")
    expect(popupCss).toContain("animation: analysis-sheen 5.6s linear infinite")
    expect(popupCss).toMatch(/55%\s*{[^}]*background-position:\s*78% 0/)
    expect(popupCss).toMatch(/70%\s*{[^}]*background-position:\s*4% 0/)
    expect(popupCss).toMatch(/76%\s*{[^}]*background-position:\s*-75% 0/)
    expect(popupCss).toContain("animation: analysis-glow 5.6s ease-in-out infinite")
    expect(popupCss).toContain("animation: analysis-icon-alive 5.6s")
    expect(popupCss).toMatch(/\.analysis-primary\s*{[^}]*z-index:\s*1/s)
    expect(popupCss).toMatch(/\.analysis-menu-trigger\s*{[^}]*z-index:\s*1/s)
  })
})
