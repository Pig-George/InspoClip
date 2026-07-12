import { getExtensionDayOfWeek, getMonday, formatDate } from "./date"
import { dataUrlToBlob } from "./image"

export async function captureAndUpload(serverUrl: string, dayOfWeek?: number) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.windowId) throw new Error("No active tab")

  const now = new Date()
  const actualDayOfWeek = dayOfWeek ?? getExtensionDayOfWeek(now)
  const dateStr = formatDate(getMonday(now))

  const weekRes = await fetch(`${serverUrl}/api/weeks/${dateStr}`)
  if (!weekRes.ok) throw new Error("Failed to get week")
  const weekData = await weekRes.json()

  const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "jpeg", quality: 85 })
  const blob = dataUrlToBlob(dataUrl)
  const ext = blob.type === "image/png" ? ".png" : ".jpg"
  const formData = new FormData()
  formData.append("image", blob, "screenshot" + ext)
  formData.append("weekId", weekData.week.id)
  formData.append("dayOfWeek", String(actualDayOfWeek))

  const uploadRes = await fetch(`${serverUrl}/api/images`, { method: "POST", body: formData })
  if (!uploadRes.ok) throw new Error("Upload failed")
  return uploadRes.json()
}
