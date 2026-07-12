import { buildClientVideoUrl, uploadVideoUrl } from "./src/video"

const DEFAULT_SERVER = "http://localhost:3001"

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: "inspoclip-save-image", title: "Save Image to InspoClip", contexts: ["image"] })
  chrome.contextMenus.create({ id: "inspoclip-save-video", title: "Save and analyze video with InspoClip", contexts: ["video"] })
  chrome.contextMenus.create({ id: "inspoclip-save-page", title: "Save Page to InspoClip", contexts: ["page"] })
  chrome.contextMenus.create({ id: "inspoclip-analyze-image", title: "Analyze Image with InspoClip", contexts: ["image"] })
  chrome.contextMenus.create({ id: "inspoclip-analyze-page", title: "Analyze Page with InspoClip", contexts: ["page"] })
})

chrome.commands.onCommand.addListener(async (command) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.id) return

  if (command === "area-analyze") {
    await sendContentMessage(tab.id, { type: "START_AREA_CAPTURE", mode: "analyze" })
  }

  if (command === "area-save") {
    await sendContentMessage(tab.id, { type: "START_AREA_CAPTURE", mode: "save" })
  }
})

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "inspoclip-save-video") {
    try {
      const result = await saveVideoFromUrl(info.srcUrl)
      const settings = await chrome.storage.sync.get(["appUrl"])
      const appUrl = settings.appUrl || (await getServerUrl()).replace(/:3001$/, ":8080")
      await chrome.tabs.create({ url: buildClientVideoUrl(appUrl, result.videoId) })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Video upload failed"
      console.error("Failed to save video:", err)
      chrome.notifications.create({ type: "basic", iconUrl: "assets/icon128.png", title: "InspoClip", message })
    }
    return
  }

  if (info.menuItemId === "inspoclip-analyze-image" || info.menuItemId === "inspoclip-analyze-page") {
    if (!tab?.id) return
    await sendContentMessage(tab.id, {
      type: info.mediaType === "image" ? "ANALYZE_IMAGE" : "ANALYZE_PAGE",
      imageUrl: info.srcUrl || null
    })
    return
  }

  if (info.menuItemId !== "inspoclip-save-image" && info.menuItemId !== "inspoclip-save-page") return
  if (!tab?.id) return

  await sendContentMessage(tab.id, {
    type: "SAVE_IMAGE",
    imageUrl: info.srcUrl || null,
    isImage: info.mediaType === "image"
  })
})

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "CAPTURE_TAB") {
    const tabId = sender.tab?.id
    if (tabId) {
      chrome.tabs.get(tabId, async (tab) => {
        try {
          const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "jpeg", quality: 85 })
          sendResponse({ dataUrl })
        } catch (err) {
          sendResponse({ error: err instanceof Error ? err.message : "Capture failed" })
        }
      })
      return true
    }
  }

  if (message.type === "CAPTURE_AND_UPLOAD") {
    captureAndUpload(message.serverUrl, message.dayOfWeek)
      .then((result) => sendResponse({ success: true, ...result }))
      .catch((err) => sendResponse({ success: false, error: err instanceof Error ? err.message : "Upload failed" }))
    return true
  }

  if (message.type === "FETCH_IMAGE") {
    fetch(message.url)
      .then((res) => {
        if (!res.ok) throw new Error("Not found")
        return res.blob()
      })
      .then((blob) => {
        const reader = new FileReader()
        reader.onloadend = () => sendResponse({ dataUrl: reader.result })
        reader.readAsDataURL(blob)
      })
      .catch(() => sendResponse({ dataUrl: null }))
    return true
  }

  if (message.type === "TRIGGER_ANALYZE") {
    const imageUrl = message.imageUrl || null
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (!tabs[0]?.id) return
      try {
        await sendContentMessage(tabs[0].id, { type: imageUrl ? "ANALYZE_IMAGE" : "ANALYZE_PAGE", imageUrl })
        sendResponse({ ok: true })
      } catch (err) {
        sendResponse({ error: err instanceof Error ? err.message : "Failed to trigger analysis" })
      }
    })
    return true
  }

  if (message.type === "UPLOAD_VIDEO_URL") {
    saveVideoFromUrl(message.url, message.serverUrl)
      .then((result) => sendResponse({ success: true, ...result }))
      .catch((err) => sendResponse({ success: false, error: err instanceof Error ? err.message : "Upload failed" }))
    return true
  }
})

async function sendContentMessage(tabId: number, message: unknown) {
  try {
    return await chrome.tabs.sendMessage(tabId, message)
  } catch (err) {
    console.error("Failed to send content message:", err)
    throw err
  }
}

async function saveVideoFromUrl(url?: string, explicitServerUrl?: string) {
  if (!url) throw new Error("No video URL found")
  const serverUrl = explicitServerUrl || (await getServerUrl())
  return uploadVideoUrl<{ videoId: string; jobId: string; status: string }>(fetch, serverUrl, url)
}

async function captureAndUpload(serverUrl: string, dayOfWeek?: number) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.windowId) throw new Error("No active tab")

  const now = new Date()
  const dow = now.getDay()
  const actualDayOfWeek = dayOfWeek ?? (dow === 0 ? 6 : dow - 1)
  const monday = getMonday(now)
  const dateStr = formatDate(monday)

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

function dataUrlToBlob(dataUrl: string) {
  const parts = dataUrl.split(",")
  const mime = parts[0].match(/:(.*?);/)?.[1] || "image/jpeg"
  const binaryStr = atob(parts[1])
  const bytes = new Uint8Array(binaryStr.length)
  for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

async function getServerUrl() {
  const result = await chrome.storage.sync.get(["serverUrl"])
  return result.serverUrl || DEFAULT_SERVER
}

function getMonday(date: Date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d
}

function formatDate(date: Date) {
  return date.toISOString().split("T")[0]
}
