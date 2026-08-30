import { getExtensionDayOfWeek, getMonday, formatDate } from "./date"
import { dataUrlToBlob } from "./image"
import { getBackgroundRuntime } from "../runtime/background-runtime"

export async function captureAndUpload(dayOfWeek?: number): Promise<Record<string, unknown>> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.windowId) throw new Error("No active tab")

  const now = new Date()
  const actualDayOfWeek = dayOfWeek ?? getExtensionDayOfWeek(now)
  const dateStr = formatDate(getMonday(now))

  const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "jpeg", quality: 85 })
  const blob = dataUrlToBlob(dataUrl)
  const ext = blob.type === "image/png" ? ".png" : ".jpg"
  const runtime = await getBackgroundRuntime()
  return runtime.assets.saveImage({
    blob,
    filename: "screenshot" + ext,
    mimeType: blob.type,
    weekStart: dateStr,
    dayOfWeek: actualDayOfWeek
  }) as Promise<Record<string, unknown>>
}
