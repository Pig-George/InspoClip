import { CONTEXT_MENUS } from "./src/background/constants"
import { runBackgroundBootstrap } from "./src/background/bootstrap"
import { captureAndUpload } from "./src/background/capture"
import { fetchImageAsDataUrl, sendContentMessage } from "./src/background/messages"
import offscreenDocumentUrl from "url:./offscreen.html"
import { getExtensionRelativeUrl, getOffscreenDocumentOptions, getTabCaptureStreamOptions, normalizeTabCaptureErrorMessage, openAreaCaptureSelector, prepareTabCaptureSource } from "./src/background/offscreen-recording"
import { sendOffscreenMessageWithRetry } from "./src/background/offscreen-messaging"
import { openVideoInApp, saveVideoFromUrl } from "./src/background/video"
import { createCommandRouter } from "./src/runtime/command-router"
import { isExtensionCommand } from "./src/runtime/contracts"
import { getBackgroundRuntime } from "./src/runtime/background-runtime"
import { initializeRuntimeMode } from "./src/runtime/settings"
import { isDevelopmentBuild } from "./src/runtime/build-mode"
import { createExtensionLogRecorder, installExtensionErrorLogging, type ExtensionLogInput, type ExtensionLogStorage } from "./src/runtime/extension-logger"
import { shouldRecordRuntimeCommandFailure } from "./src/runtime/command-error-policy"

const OFFSCREEN_DOCUMENT_PATH = getExtensionRelativeUrl(offscreenDocumentUrl)
let recordBackgroundLog: (input: ExtensionLogInput) => Promise<void> = async () => undefined

function recordBackgroundError(error: unknown, context?: Record<string, unknown>): void {
  void recordBackgroundLog({ source: "background", level: "error", error, context })
}
let creatingOffscreenDocument: Promise<void> | null = null
const runtimeCommandRouter = createCommandRouter(getBackgroundRuntime)

chrome.runtime.onInstalled.addListener((details) => {
  void initializeRuntimeMode(details.reason).catch((error) => {
    recordBackgroundError(error, { event: "runtime.initialize", reason: details.reason })
    console.error("Failed to initialize InspoClip runtime mode:", error)
  })
  CONTEXT_MENUS.forEach((item) => chrome.contextMenus.create(item))
})

chrome.commands.onCommand.addListener(async (command) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.id) return

  if (command === "area-analyze") {
    await startAreaCaptureSession(tab.id, "analyze")
  }

  if (command === "area-save") {
    await startAreaCaptureSession(tab.id, "save")
  }
})

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "inspoclip-save-video") {
    try {
      const result = await saveVideoFromUrl(info.srcUrl)
      await openVideoInApp(result.videoId)
    } catch (err) {
      recordBackgroundError(err, { event: "context-menu.save-video" })
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
  return sendOffscreenMessageWithRetry(message, {
    send: (nextMessage) => chrome.runtime.sendMessage(nextMessage)
  })
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

function releasePreparedSource(sourceId: string): Promise<unknown> {
  return sendOffscreenMessage({
    type: "RELEASE_OFFSCREEN_AREA_RECORDING_SOURCE",
    sourceId
  })
}

function startAreaCaptureSession(tabId: number, mode: "analyze" | "save"): Promise<void> {
  return openAreaCaptureSelector(tabId, mode, {
    sendContentMessage: async (currentTabId, message) => {
      try {
        return await sendContentMessage(currentTabId, message)
      } catch (error) {
        recordBackgroundError(error, { event: "area-capture.content-open" })
        throw error
      }
    }
  })
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (isExtensionCommand(message)) {
    runtimeCommandRouter.dispatch(message)
      .then((response) => {
        if (response && response.ok === false && shouldRecordRuntimeCommandFailure(message.type, response.error, message.payload)) {
          recordBackgroundError(response.error, { event: "runtime.command", command: message.type })
        }
        sendResponse(response)
      })
      .catch((error) => {
        recordBackgroundError(error, { event: "runtime.command" })
        sendResponse({
          ok: false,
          error: { code: "UNKNOWN_ERROR", message: error instanceof Error ? error.message : "Runtime command failed", retryable: false }
        })
      })
    return true
  }

  if (message.type === "REQUEST_STANDALONE_VIDEO_FRAMES") {
    ;(async () => {
      await ensureOffscreenDocument()
      return sendOffscreenMessage({
        type: "EXTRACT_OFFSCREEN_VIDEO_FRAMES",
        dataUrl: message.dataUrl,
        frameCount: message.frameCount
      })
    })()
      .then((response) => sendResponse(response))
      .catch((error) => {
        recordBackgroundError(error, { event: "standalone-video.extract-frames" })
        sendResponse({ success: false, error: error instanceof Error ? error.message : "Video frame extraction failed" })
      })
    return true
  }

  if (message.type === "START_AREA_CAPTURE_SESSION") {
    ;(async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (!tab?.id) throw new Error("No active tab")
      await startAreaCaptureSession(tab.id, message.mode)
      return { success: true }
    })()
      .then((response) => sendResponse(response))
      .catch((err) => {
        recordBackgroundError(err, { event: "area-capture.prepare" })
        sendResponse({ success: false, error: err instanceof Error ? err.message : "Failed to prepare area capture" })
      })
    return true
  }

  if (message.type === "CAPTURE_TAB") {
    const tabId = sender.tab?.id
    if (!tabId) return

    chrome.tabs.get(tabId, async (tab) => {
      try {
        const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "jpeg", quality: 85 })
        sendResponse({ dataUrl })
      } catch (err) {
        recordBackgroundError(err, { event: "capture-tab" })
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
        viewport: message.viewport,
        includeTabAudio: Boolean(message.includeTabAudio)
      })
    })()
      .then((response) => sendResponse(response))
      .catch((err) => {
        recordBackgroundError(err, { event: "recording.start" })
        sendResponse({ success: false, error: err instanceof Error ? err.message : "Failed to start recording" })
      })
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
      .catch((err) => {
        recordBackgroundError(err, { event: "recording.prepare" })
        sendResponse({ success: false, error: err instanceof Error ? err.message : "Failed to prepare recording" })
      })
    return true
  }

  if (message.type === "RELEASE_AREA_RECORDING_SOURCE") {
    sendOffscreenMessage({
      type: "RELEASE_OFFSCREEN_AREA_RECORDING_SOURCE",
      sourceId: message.sourceId
    })
      .then((response) => sendResponse(response))
      .catch((err) => {
        recordBackgroundError(err, { event: "recording.release" })
        sendResponse({ success: false, error: err instanceof Error ? err.message : "Failed to release recording source" })
      })
    return true
  }

  if (message.type === "PAUSE_AREA_RECORDING" || message.type === "RESUME_AREA_RECORDING" || message.type === "PREPARE_RETAKE_AREA_RECORDING" || message.type === "START_RETAKE_AREA_RECORDING" || message.type === "RETAKE_AREA_RECORDING" || message.type === "STOP_AREA_RECORDING" || message.type === "CANCEL_AREA_RECORDING") {
    const offscreenType = {
      PAUSE_AREA_RECORDING: "PAUSE_OFFSCREEN_AREA_RECORDING",
      RESUME_AREA_RECORDING: "RESUME_OFFSCREEN_AREA_RECORDING",
      PREPARE_RETAKE_AREA_RECORDING: "PREPARE_RETAKE_OFFSCREEN_AREA_RECORDING",
      START_RETAKE_AREA_RECORDING: "START_RETAKE_OFFSCREEN_AREA_RECORDING",
      RETAKE_AREA_RECORDING: "RETAKE_OFFSCREEN_AREA_RECORDING",
      STOP_AREA_RECORDING: "STOP_OFFSCREEN_AREA_RECORDING",
      CANCEL_AREA_RECORDING: "CANCEL_OFFSCREEN_AREA_RECORDING"
    }[message.type]

    sendOffscreenMessage({
      type: offscreenType,
      recordingId: message.recordingId
    })
      .then((response) => sendResponse(response))
      .catch((err) => {
        recordBackgroundError(err, { event: "recording.command", command: message.type })
        sendResponse({ success: false, error: err instanceof Error ? err.message : "Recording command failed" })
      })
    return true
  }

  if (message.type === "CAPTURE_AND_UPLOAD") {
    captureAndUpload(message.dayOfWeek)
      .then((result) => sendResponse({ success: true, ...result }))
      .catch((err) => {
        recordBackgroundError(err, { event: "capture-and-upload" })
        sendResponse({ success: false, error: err instanceof Error ? err.message : "Upload failed" })
      })
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
        recordBackgroundError(err, { event: "trigger-analyze" })
        sendResponse({ error: err instanceof Error ? err.message : "Failed to trigger analysis" })
      }
    })
    return true
  }

  if (message.type === "UPLOAD_VIDEO_URL") {
    saveVideoFromUrl(message.url, { draft: message.draft === true })
      .then((result) => sendResponse({ success: true, ...result }))
      .catch((err) => {
        recordBackgroundError(err, { event: "upload-video-url" })
        sendResponse({ success: false, error: err instanceof Error ? err.message : "Upload failed" })
      })
    return true
  }
})

// Register all message listeners before optional diagnostics setup. A logging
// failure must never leave the Service Worker without a request receiver.
runBackgroundBootstrap(() => {
  const backgroundLogStorage = chrome.storage.local as unknown as ExtensionLogStorage
  recordBackgroundLog = createExtensionLogRecorder(backgroundLogStorage, isDevelopmentBuild)
  installExtensionErrorLogging({
    source: "background",
    enabled: isDevelopmentBuild,
    storage: backgroundLogStorage,
    captureConsole: false
  })
})
