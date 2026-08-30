import { DEFAULT_APP_URL, DEFAULT_MODEL_SETTINGS, DEFAULT_SERVER_URL, DEFAULT_SHORTCUTS } from "../constants"
import type { Locale, ModelSettings, PopupSettings, ShortcutSettings } from "../types"
import { loadRuntimeMode, saveRuntimeMode } from "../../runtime/settings"
import { normalizeBackendUrl } from "../../runtime/backend-url"

export async function loadPopupSettings(): Promise<PopupSettings> {
  const result = await chrome.storage.sync.get(["serverUrl", "appUrl", "shortcuts", "lang"])
  const localResult = await chrome.storage.local.get(["modelSettings"])
  const modelSettings = (localResult.modelSettings || {}) as Partial<ModelSettings>
  const serverUrl = normalizeBackendUrl(result.serverUrl || DEFAULT_SERVER_URL)
  return {
    runtimeMode: await loadRuntimeMode(),
    modelSettings: { ...DEFAULT_MODEL_SETTINGS, ...modelSettings },
    serverUrl,
    appUrl: result.appUrl || serverUrl.replace(/:3001$/, ":8080") || DEFAULT_APP_URL,
    shortcuts: {
      ...DEFAULT_SHORTCUTS,
      ...(result.shortcuts as Partial<ShortcutSettings> | undefined)
    },
    lang: result.lang as Locale | undefined
  }
}

export async function savePopupSettings(settings: PopupSettings): Promise<void> {
  await saveRuntimeMode(settings.runtimeMode)
  await chrome.storage.local.set({ modelSettings: settings.modelSettings })
  await chrome.storage.sync.set({
    serverUrl: settings.serverUrl,
    appUrl: settings.appUrl,
    shortcuts: settings.shortcuts,
    lang: settings.lang
  })
}

export function normalizeServerUrl(value: string): string {
  return normalizeBackendUrl(value || DEFAULT_SERVER_URL)
}

export function normalizeAppUrl(value: string, serverUrl: string): string {
  return value.trim().replace(/\/$/, "") || serverUrl.replace(/:3001$/, ":8080")
}
