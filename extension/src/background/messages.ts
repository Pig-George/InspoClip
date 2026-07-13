type ManifestContentScript = { js?: string[] }
type RuntimeManifest = { content_scripts?: ManifestContentScript[] }

const INJECTABLE_PROTOCOLS = new Set(["http:", "https:"])

function getManifestContentScriptFiles(manifest: RuntimeManifest): string[] {
  return (manifest.content_scripts || []).flatMap((script) => script.js || [])
}

function isInjectableTabUrl(url?: string): boolean {
  if (!url) return false
  try {
    return INJECTABLE_PROTOCOLS.has(new URL(url).protocol)
  } catch {
    return false
  }
}

async function injectContentScripts(tabId: number): Promise<void> {
  const files = getManifestContentScriptFiles(chrome.runtime.getManifest())
  if (files.length === 0) throw new Error("No content scripts configured")
  await chrome.scripting.executeScript({ target: { tabId }, files })
}

export async function sendContentMessage(tabId: number, message: unknown): Promise<unknown> {
  const tab = await chrome.tabs.get(tabId)
  if (!isInjectableTabUrl(tab.url)) {
    throw new Error("Cannot access this page. Please open a normal http/https webpage and try again.")
  }
  try {
    return await chrome.tabs.sendMessage(tabId, message)
  } catch (err) {
    try {
      await injectContentScripts(tabId)
      return await chrome.tabs.sendMessage(tabId, message)
    } catch {
      // Preserve the original Chrome error if injection did not resolve the missing content script.
    }
    console.error("Failed to send content message:", err)
    throw err
  }
}

export async function fetchImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error("Not found")
    const blob = await res.blob()
    return await blobToDataUrl(blob)
  } catch {
    return null
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(String(reader.result || ""))
    reader.readAsDataURL(blob)
  })
}
