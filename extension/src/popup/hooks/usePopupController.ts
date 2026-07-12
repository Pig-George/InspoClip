import { useEffect, useMemo, useState } from "react"

import { buildClientVideoUrl, pollVideoJob, uploadVideoBlob } from "../../video"
import { DEFAULT_APP_URL, DEFAULT_SERVER_URL, DEFAULT_SHORTCUTS, I18N, MAX_VIDEO_SIZE_BYTES, detectBrowserLocale } from "../constants"
import { detectAssetKind, uploadImageForAnalysis, type ImageAnalysisResult } from "../services/assets"
import { loadPopupSettings, normalizeAppUrl, normalizeServerUrl, savePopupSettings } from "../services/settings"
import { openOrFocusApp, sendCurrentTabMessage } from "../services/tabs"
import type { CaptureMode, ConnectionState, Locale, ShortcutTarget, StatusMessage } from "../types"

export function usePopupController() {
  const [locale, setLocale] = useState<Locale>(() => detectBrowserLocale())
  const [serverUrl, setServerUrl] = useState(DEFAULT_SERVER_URL)
  const [appUrl, setAppUrl] = useState(DEFAULT_APP_URL)
  const [captureMode, setCaptureMode] = useState<CaptureMode>("area")
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [connectionState, setConnectionState] = useState<ConnectionState>("testing")
  const [connectionLabel, setConnectionLabel] = useState("")
  const [status, setStatus] = useState<StatusMessage | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [shortcutAnalyze, setShortcutAnalyze] = useState(DEFAULT_SHORTCUTS.analyze)
  const [shortcutSave, setShortcutSave] = useState(DEFAULT_SHORTCUTS.save)
  const [recordingShortcut, setRecordingShortcut] = useState<ShortcutTarget | null>(null)
  const [assetUrl, setAssetUrl] = useState("")
  const [assetProgress, setAssetProgress] = useState("")
  const [assetResultUrl, setAssetResultUrl] = useState("")

  const t = useMemo(() => I18N[locale], [locale])

  useEffect(() => {
    loadPopupSettings().then((settings) => {
      setServerUrl(settings.serverUrl)
      setAppUrl(settings.appUrl)
      setShortcutAnalyze(settings.shortcuts.analyze)
      setShortcutSave(settings.shortcuts.save)
      if (settings.lang) setLocale(settings.lang)
    })
  }, [])

  useEffect(() => {
    void testServerConnection()
  }, [serverUrl, locale])

  async function testServerConnection() {
    setConnectionState("testing")
    setConnectionLabel("...")
    try {
      const res = await fetch(`${serverUrl}/api/health`, { signal: AbortSignal.timeout(3000) })
      if (res.ok) {
        setConnectionState("connected")
        setConnectionLabel(I18N[locale].connected)
        setTimeout(() => setConnectionLabel(""), 3000)
        return
      }

      setConnectionState("error")
      setConnectionLabel(I18N[locale].error)
    } catch {
      setConnectionState("error")
      setConnectionLabel(I18N[locale].offline)
    }
  }

  async function toggleLanguage() {
    const next = locale === "en" ? "zh" : "en"
    setLocale(next)
    await chrome.storage.sync.set({ lang: next })
  }

  async function saveSettings() {
    const normalizedServerUrl = normalizeServerUrl(serverUrl)
    const normalizedAppUrl = normalizeAppUrl(appUrl, normalizedServerUrl)
    setServerUrl(normalizedServerUrl)
    setAppUrl(normalizedAppUrl)
    await savePopupSettings({
      serverUrl: normalizedServerUrl,
      appUrl: normalizedAppUrl,
      shortcuts: {
        analyze: shortcutAnalyze.trim(),
        save: shortcutSave.trim()
      },
      lang: locale
    })
    await testServerConnection()
  }

  async function triggerAnalyze() {
    setAnalyzing(true)
    const msg = captureMode === "area" ? { type: "START_AREA_CAPTURE", mode: "analyze" } : { type: "ANALYZE_PAGE" }
    try {
      await sendCurrentTabMessage(msg)
      setTimeout(() => window.close(), 200)
    } catch {
      showStatus("Failed to start analysis", "error")
      setAnalyzing(false)
    }
  }

  async function triggerSave() {
    setSaving(true)
    const msg =
      captureMode === "area"
        ? { type: "START_AREA_CAPTURE", mode: "save" }
        : { type: "SAVE_IMAGE", imageUrl: null, isImage: false }
    try {
      await sendCurrentTabMessage(msg)
      setTimeout(() => window.close(), 200)
    } catch {
      showStatus("Failed to start save", "error")
      setSaving(false)
    }
  }

  async function openApp(event: React.MouseEvent<HTMLAnchorElement>) {
    event.preventDefault()
    await openOrFocusApp(appUrl)
  }

  function showStatus(message: string, type: StatusMessage["type"]) {
    setStatus({ message, type })
    setTimeout(() => setStatus(null), 3000)
  }

  async function trackVideo(result: { videoId: string; jobId: string }) {
    setAssetProgress(t.waitingAnalysis)
    setAssetResultUrl("")
    const job = await pollVideoJob<{ status: string; progress?: number; errorMessage?: string }>(fetch, serverUrl, result.jobId, {
      onUpdate: (value) => setAssetProgress(`${value.status} · ${value.progress || 0}%`)
    })
    if (job.status === "failed") throw new Error(job.errorMessage || "Video analysis failed")
    setAssetProgress(t.analysisCompleted)
    setAssetResultUrl(buildClientVideoUrl(appUrl, result.videoId))
  }

  async function analyzeImage(file: File) {
    setAssetProgress(t.analyzingAsset)
    setAssetResultUrl("")
    const result = await uploadImageForAnalysis<ImageAnalysisResult>(fetch, serverUrl, file)
    const terms = (result.terms || []).slice(0, 3).join(", ")
    setAssetProgress(terms ? `${t.imageAnalysisCompleted}: ${terms}` : t.imageAnalysisCompleted)
  }

  async function handleAssetFile(file?: File) {
    if (!file) return
    setAssetProgress(t.uploading)
    try {
      const assetKind = detectAssetKind(file)
      if (assetKind === "image") {
        await analyzeImage(file)
        return
      }
      if (assetKind === "unsupported") throw new Error(t.unsupportedAsset)
      if (file.size > MAX_VIDEO_SIZE_BYTES) throw new Error("Video exceeds 200MB")
      await trackVideo(await uploadVideoBlob<{ videoId: string; jobId: string }>(fetch, serverUrl, file, file.name))
    } catch (err) {
      setAssetProgress(err instanceof Error ? err.message : "Upload failed")
    }
  }

  async function handleAssetUrl() {
    setAssetProgress(t.fetchingVideo)
    try {
      const response = await chrome.runtime.sendMessage({ type: "UPLOAD_VIDEO_URL", url: assetUrl, serverUrl })
      if (!response?.success) throw new Error(response?.error || "Upload failed")
      await trackVideo(response)
    } catch (err) {
      setAssetProgress(err instanceof Error ? err.message : "Upload failed")
    }
  }

  return {
    appUrl,
    analyzing,
    captureMode,
    connectionLabel,
    connectionState,
    locale,
    recordingShortcut,
    saving,
    serverUrl,
    settingsOpen,
    shortcutAnalyze,
    shortcutSave,
    status,
    t,
    assetProgress,
    assetResultUrl,
    assetUrl,
    handleAssetFile,
    handleAssetUrl,
    openApp,
    saveSettings,
    setAppUrl,
    setCaptureMode,
    setRecordingShortcut,
    setServerUrl,
    setSettingsOpen,
    setShortcutAnalyze,
    setShortcutSave,
    setAssetUrl,
    testServerConnection,
    toggleLanguage,
    triggerAnalyze,
    triggerSave
  }
}
