import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, test, vi } from "vitest"

import { I18N } from "../constants"
import { DevelopmentDiagnostics } from "./DevelopmentDiagnostics"

describe("DevelopmentDiagnostics", () => {
  test("renders unified extension log details and actions", () => {
    const markup = renderToStaticMarkup(createElement(DevelopmentDiagnostics, {
      diagnostics: [{
        timestamp: "2026-08-02T10:00:00.000Z",
        source: "backend",
        level: "error",
        message: "fetch failed",
        context: { url: "http://127.0.0.1:3001/api/images/analyze", method: "POST" }
      }],
      t: I18N.en,
      onClear: vi.fn()
    }))

    expect(markup).toContain("Extension logs")
    expect(markup).toContain("[backend] error")
    expect(markup).toContain("POST http://127.0.0.1:3001/api/images/analyze")
    expect(markup).toContain("fetch failed")
    expect(markup).toContain('data-popup-icon="copy"')
    expect(markup).toContain('data-popup-icon="trash-2"')
  })

  test("renders an empty state when no extension logs were recorded", () => {
    const markup = renderToStaticMarkup(createElement(DevelopmentDiagnostics, {
      diagnostics: [],
      t: I18N.en,
      onClear: vi.fn()
    }))

    expect(markup).toContain("No extension logs recorded.")
  })
})
