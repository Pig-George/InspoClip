type ManifestContentScript = {
  js?: string[]
}

type RuntimeManifest = {
  content_scripts?: ManifestContentScript[]
}

export type TabAccessMessages = {
  inaccessiblePage: string
  inaccessibleFilePage: string
}

const INJECTABLE_PROTOCOLS = new Set(["http:", "https:"])
const DEFAULT_TAB_ACCESS_MESSAGES: TabAccessMessages = {
  inaccessiblePage: "Cannot access this page. Please open a normal http/https webpage and try again.",
  inaccessibleFilePage: "Cannot access local file pages. Please open a normal http/https webpage, or enable file access for this extension in Chrome."
}

export function getManifestContentScriptFiles(manifest: RuntimeManifest): string[] {
  return (manifest.content_scripts || []).flatMap((script) => script.js || [])
}

export function isInjectableTabUrl(url?: string): boolean {
  if (!url) return false
  try {
    return INJECTABLE_PROTOCOLS.has(new URL(url).protocol)
  } catch {
    return false
  }
}

export function getTabAccessErrorMessage(url?: string, messages: TabAccessMessages = DEFAULT_TAB_ACCESS_MESSAGES): string {
  if (!url) return messages.inaccessiblePage
  let protocol = ""
  try {
    protocol = new URL(url).protocol
  } catch {
    return messages.inaccessiblePage
  }
  if (protocol === "file:") {
    return messages.inaccessibleFilePage
  }
  return messages.inaccessiblePage
}

export async function sendCurrentTabMessage(message: unknown, accessMessages?: TabAccessMessages): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.id) throw new Error("No active tab")
  if (!isInjectableTabUrl(tab.url)) throw new Error(getTabAccessErrorMessage(tab.url, accessMessages))
  await sendTabMessageWithContentScriptFallback(tab.id, message)
}

export async function requestAreaCaptureSession(mode: "analyze" | "save"): Promise<void> {
  const response = await chrome.runtime.sendMessage({ type: "START_AREA_CAPTURE_SESSION", mode })
  if (!response?.success) {
    throw new Error(response?.error || "Failed to prepare area capture")
  }
}

async function sendTabMessageWithContentScriptFallback(tabId: number, message: unknown): Promise<void> {
  try {
    await chrome.tabs.sendMessage(tabId, message)
    return
  } catch (initialError) {
    await injectContentScripts(tabId)
    try {
      await chrome.tabs.sendMessage(tabId, message)
    } catch {
      throw initialError
    }
  }
}

async function injectContentScripts(tabId: number): Promise<void> {
  const files = getManifestContentScriptFiles(chrome.runtime.getManifest())
  if (files.length === 0) throw new Error("No content scripts configured")
  await chrome.scripting.executeScript({ target: { tabId }, files })
}

export async function openOrFocusApp(appUrl: string): Promise<void> {
  const appOrigin = new URL(appUrl).origin
  const tabs = await chrome.tabs.query({})
  const existing = tabs.find((tab) => tab.url && tab.url.startsWith(appOrigin))
  if (existing?.id && existing.windowId) {
    await chrome.tabs.update(existing.id, { active: true })
    await chrome.windows.update(existing.windowId, { focused: true })
    return
  }

  await chrome.tabs.create({ url: appUrl })
}
