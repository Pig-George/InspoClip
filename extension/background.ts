import { CONTEXT_MENUS } from "./src/background/constants"
import { captureAndUpload } from "./src/background/capture"
import { fetchImageAsDataUrl, sendContentMessage } from "./src/background/messages"
import offscreenDocumentUrl from "url:./offscreen.html"
import { getExtensionRelativeUrl, getOffscreenDocumentOptions, getTabCaptureStreamOptions, normalizeTabCaptureErrorMessage, prepareTabCaptureSource } from "./src/background/offscreen-recording"
import { openVideoInApp, saveVideoFromUrl } from "./src/background/video"

const OFFSCREEN_DOCUMENT_PATH = getExtensionRelativeUrl(offscreenDocumentUrl)
let creatingOffscreenDocument: Promise<void> | null = null

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

async function ensureOffscreenDocument(): Promise<void> {
  if (await chrome.offscreen.hasDocument()) return
  if (!creatingOffscreenDocument) {
    creatingOffscreenDocument = chrome.offscreen
      .createDocument(getOffscreenDocumentOptions(OFFSCREEN_DOCUMENT_PATH))
      .finally(() => {
        creatingOffscreenDocument = null
      })
  }
  await creatingOffscreenDocument
}

function sendOffscreenMessage<T = Record<string, unknown>>(message: Record<string, unknown>): Promise<T> {
  return chrome.runtime.sendMessage(message)
}

function getMediaStreamId(options: chrome.tabCapture.GetMediaStreamOptions): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.tabCapture.getMediaStreamId(options, (streamId) => {
      const error = chrome.runtime.lastError
      if (error || !streamId) {
        reject(new Error(normalizeTabCaptureErrorMessage(error?.message)))
        return
      }
      resolve(streamId)
    })
  })
}

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

  if (message.type === "START_AREA_RECORDING") {
    const tabId = sender.tab?.id
    if (!tabId) {
      sendResponse({ success: false, error: "Cannot access the current tab for recording" })
      return
    }

    ;(async () => {
      await ensureOffscreenDocument()
      const streamId = message.sourceId ? undefined : await getMediaStreamId(getTabCaptureStreamOptions(tabId))
      return sendOffscreenMessage({
        type: "START_OFFSCREEN_AREA_RECORDING",
        recordingId: message.recordingId,
        sourceId: message.sourceId,
        streamId,
        rect: message.rect,
        viewport: message.viewport
      })
    })()
      .then((response) => sendResponse(response))
      .catch((err) => sendResponse({ success: false, error: err instanceof Error ? err.message : "Failed to start recording" }))
    return true
  }

  if (message.type === "PREPARE_AREA_RECORDING") {
    const tabId = sender.tab?.id
    if (!tabId) {
      sendResponse({ success: false, error: "Cannot access the current tab for recording" })
      return
    }

    ;(async () => {
      return prepareTabCaptureSource(tabId, message.sourceId, {
        getStreamId: getMediaStreamId,
        ensureOffscreenDocument,
        sendOffscreenMessage
      })
    })()
      .then((response) => sendResponse(response))
      .catch((err) => sendResponse({ success: false, error: err instanceof Error ? err.message : "Failed to prepare recording" }))
    return true
  }

  if (message.type === "RELEASE_AREA_RECORDING_SOURCE") {
    sendOffscreenMessage({
      type: "RELEASE_OFFSCREEN_AREA_RECORDING_SOURCE",
      sourceId: message.sourceId
    })
      .then((response) => sendResponse(response))
      .catch((err) => sendResponse({ success: false, error: err instanceof Error ? err.message : "Failed to release recording source" }))
    return true
  }

  if (message.type === "PAUSE_AREA_RECORDING" || message.type === "RESUME_AREA_RECORDING" || message.type === "STOP_AREA_RECORDING" || message.type === "CANCEL_AREA_RECORDING") {
    const offscreenType = {
      PAUSE_AREA_RECORDING: "PAUSE_OFFSCREEN_AREA_RECORDING",
      RESUME_AREA_RECORDING: "RESUME_OFFSCREEN_AREA_RECORDING",
      STOP_AREA_RECORDING: "STOP_OFFSCREEN_AREA_RECORDING",
      CANCEL_AREA_RECORDING: "CANCEL_OFFSCREEN_AREA_RECORDING"
    }[message.type]

    sendOffscreenMessage({
      type: offscreenType,
      recordingId: message.recordingId
    })
      .then((response) => sendResponse(response))
      .catch((err) => sendResponse({ success: false, error: err instanceof Error ? err.message : "Recording command failed" }))
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
