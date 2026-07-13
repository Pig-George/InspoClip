import { CONTEXT_MENUS } from "./src/background/constants"
import { captureAndUpload } from "./src/background/capture"
import { fetchImageAsDataUrl, sendContentMessage } from "./src/background/messages"
import { openVideoInApp, saveVideoFromUrl } from "./src/background/video"

chrome.runtime.onInstalled.addListener(() => {
  CONTEXT_MENUS.forEach((item) => chrome.contextMenus.create(item))
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
      await openVideoInApp(result.videoId)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Video upload failed"
      console.error("Failed to save video:", err)
      chrome.notifications.create({ type: "basic", iconUrl: "assets/icon128.png", title: "InspoClip", message })
    }
    return
  }

  if (!tab?.id) return

  if (info.menuItemId === "inspoclip-analyze-image" || info.menuItemId === "inspoclip-analyze-page") {
    await sendContentMessage(tab.id, {
      type: info.mediaType === "image" ? "ANALYZE_IMAGE" : "ANALYZE_PAGE",
      imageUrl: info.srcUrl || null
    })
    return
  }

  if (info.menuItemId === "inspoclip-save-image" || info.menuItemId === "inspoclip-save-page") {
    await sendContentMessage(tab.id, {
      type: "SAVE_IMAGE",
      imageUrl: info.srcUrl || null,
      isImage: info.mediaType === "image"
    })
  }
})

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "CAPTURE_TAB") {
    const tabId = sender.tab?.id
    if (!tabId) return

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

  if (message.type === "CAPTURE_AND_UPLOAD") {
    captureAndUpload(message.serverUrl, message.dayOfWeek)
      .then((result) => sendResponse({ success: true, ...result }))
      .catch((err) => sendResponse({ success: false, error: err instanceof Error ? err.message : "Upload failed" }))
    return true
  }

  if (message.type === "FETCH_IMAGE") {
    fetchImageAsDataUrl(message.url).then((dataUrl) => sendResponse({ dataUrl }))
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
    saveVideoFromUrl(message.url, message.serverUrl, { draft: message.draft === true })
      .then((result) => sendResponse({ success: true, ...result }))
      .catch((err) => sendResponse({ success: false, error: err instanceof Error ? err.message : "Upload failed" }))
    return true
  }
})
