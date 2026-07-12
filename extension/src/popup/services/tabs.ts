type ManifestContentScript = {
  js?: string[]
}

type RuntimeManifest = {
  content_scripts?: ManifestContentScript[]
}

export function getManifestContentScriptFiles(manifest: RuntimeManifest): string[] {
  return (manifest.content_scripts || []).flatMap((script) => script.js || [])
}

export async function sendCurrentTabMessage(message: unknown): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.id) throw new Error("No active tab")
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
