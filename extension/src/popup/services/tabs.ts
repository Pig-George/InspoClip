type ManifestContentScript = {
  js?: string[]
}

type RuntimeManifest = {
  content_scripts?: ManifestContentScript[]
}

const INJECTABLE_PROTOCOLS = new Set(["http:", "https:"])

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

export function getTabAccessErrorMessage(url?: string): string {
  if (!url) return "Cannot access this page. Please open a normal http/https webpage and try again."
  let protocol = ""
  try {
    protocol = new URL(url).protocol
  } catch {
    return "Cannot access this page. Please open a normal http/https webpage and try again."
  }
  if (protocol === "file:") {
    return "Cannot access local file pages. Please open a normal http/https webpage, or enable file access for this extension in Chrome."
  }
  return "Cannot access this page. Browser-managed pages such as chrome://, extension pages, and blank tabs cannot show the InspoClip analysis panel."
}

export async function sendCurrentTabMessage(message: unknown): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.id) throw new Error("No active tab")
  if (!isInjectableTabUrl(tab.url)) throw new Error(getTabAccessErrorMessage(tab.url))
  await sendTabMessageWithContentScriptFallback(tab.id, message)
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
