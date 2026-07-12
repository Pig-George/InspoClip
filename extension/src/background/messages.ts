export async function sendContentMessage(tabId: number, message: unknown): Promise<unknown> {
  try {
    return await chrome.tabs.sendMessage(tabId, message)
  } catch (err) {
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
