import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, test, vi } from "vitest"

import { I18N } from "../constants"
import { Header } from "./Header"

vi.stubGlobal("React", { createElement })
vi.stubGlobal("chrome", {
  runtime: {
    getURL: (path: string) => `chrome-extension://test/${path}`,
    getManifest: () => ({ icons: { "48": "assets/icon.png" } })
  }
})

const defaultProps = {
  connectionLabel: "Connected",
  connectionState: "connected" as const,
  locale: "en" as const,
  t: I18N.en,
  onTestConnection: vi.fn(),
  onToggleLanguage: vi.fn(),
  onOpenSettings: vi.fn()
}

describe("Header", () => {
  test("hides backend connection status in standalone mode", () => {
    const markup = renderToStaticMarkup(createElement(Header, {
      ...defaultProps,
      runtimeMode: "standalone"
    }))

    expect(markup).not.toContain("connection-button")
    expect(markup).not.toContain("connection-dot")
    expect(markup).not.toContain('aria-label="Connected"')
  })

  test("keeps backend connection status in backend mode", () => {
    const markup = renderToStaticMarkup(createElement(Header, {
      ...defaultProps,
      runtimeMode: "backend"
    }))

    expect(markup).toContain("connection-button connected")
    expect(markup).toContain("connection-dot")
    expect(markup).toContain('aria-label="Connected"')
  })
})
