import { DEFAULT_APP_URL, DEFAULT_SERVER_URL, DEFAULT_SHORTCUTS } from "../constants"
import type { Locale, PopupSettings, ShortcutSettings } from "../types"

export async function loadPopupSettings(): Promise<PopupSettings> {
  const result = await chrome.storage.sync.get(["serverUrl", "appUrl", "shortcuts", "lang"])
  const serverUrl = result.serverUrl || DEFAULT_SERVER_URL
  return {
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
  await chrome.storage.sync.set({
    serverUrl: settings.serverUrl,
    appUrl: settings.appUrl,
    shortcuts: settings.shortcuts,
    lang: settings.lang
  })
}

export function normalizeServerUrl(value: string): string {
  return value.trim().replace(/\/$/, "") || DEFAULT_SERVER_URL
}

export function normalizeAppUrl(value: string, serverUrl: string): string {
  return value.trim().replace(/\/$/, "") || serverUrl.replace(/:3001$/, ":8080")
}
