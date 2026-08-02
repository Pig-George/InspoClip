import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, test, vi } from "vitest"

import { I18N } from "../constants"
import { SettingsSection } from "./SettingsSection"

describe("SettingsSection", () => {
  test("renders the selected runtime mode and local storage status", () => {
    const markup = renderToStaticMarkup(createElement(SettingsSection, {
      appUrl: "http://localhost:8080",
      open: true,
      recordingShortcut: null,
      runtimeMode: "standalone",
      serverUrl: "http://localhost:3001",
      shortcutAnalyze: "Ctrl+Shift+A",
      shortcutSave: "Ctrl+Shift+S",
      storageUsageLabel: "2 KB / 4 KB",
      t: I18N.en,
      onAppUrlChange: vi.fn(),
      onClose: vi.fn(),
      onSaveSettings: vi.fn(),
      onRuntimeModeChange: vi.fn(),
      onServerUrlChange: vi.fn(),
      onSetShortcutAnalyze: vi.fn(),
      onSetShortcutSave: vi.fn(),
      onSetRecordingShortcut: vi.fn()
    }))

    expect(markup).toContain('value="standalone"')
    expect(markup).toContain("2 KB / 4 KB")
    expect(markup).toContain("Local mode")
  })
})
