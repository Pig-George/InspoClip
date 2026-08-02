import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, test, vi } from "vitest"

import { I18N } from "../constants"
import type { ModelSettings } from "../types"
import { SettingsSection } from "./SettingsSection"

describe("SettingsSection", () => {
  test("renders the selected runtime mode and local storage status", () => {
    const markup = renderToStaticMarkup(createElement(SettingsSection, {
      appUrl: "http://localhost:8080",
      modelSettings: {
        provider: "qwen",
        endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1",
        model: "qwen3.7-plus",
        apiKey: ""
      },
      onModelSettingsChange: vi.fn(),
      open: true,
      version: "1.5.3",
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

  test("shows model configuration and hides backend connection fields in standalone mode", () => {
    const model: ModelSettings = {
      provider: "qwen",
      endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1",
      model: "qwen3.7-plus",
      apiKey: "secret"
    }
    const markup = renderToStaticMarkup(createElement(SettingsSection, {
      appUrl: "http://localhost:8080",
      modelSettings: model,
      onModelSettingsChange: vi.fn(),
      open: true,
      version: "1.5.3",
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

    expect(markup).toContain("Model provider")
    expect(markup).toContain("qwen3.7-plus")
    expect(markup).toContain('class="settings-version"')
    expect(markup).toContain("v1.5.3")
    expect(markup).not.toContain('id="serverUrl"')
    expect(markup).not.toContain('id="appUrl"')
  })
})
