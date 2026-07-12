export async function sendCurrentTabMessage(message: unknown): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.id) throw new Error("No active tab")
  await chrome.tabs.sendMessage(tab.id, message)
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
