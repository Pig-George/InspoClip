import { useEffect, useMemo, useState } from "react"

import { DEFAULT_APP_URL, DEFAULT_SERVER_URL, DEFAULT_SHORTCUTS, I18N, MAX_VIDEO_SIZE_BYTES, detectBrowserLocale } from "../constants"
import { buildAssetAnalysisMessage, detectAssetKind } from "../services/assets"
import { loadPopupSettings, normalizeAppUrl, normalizeServerUrl, savePopupSettings } from "../services/settings"
import { getTabDisplayLabel, openOrFocusApp, requestAreaCaptureSession, sendCurrentTabMessage } from "../services/tabs"
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
  const [shortcutAnalyze, setShortcutAnalyze] = useState(DEFAULT_SHORTCUTS.analyze)
  const [shortcutSave, setShortcutSave] = useState(DEFAULT_SHORTCUTS.save)
  const [recordingShortcut, setRecordingShortcut] = useState<ShortcutTarget | null>(null)
  const [assetUrl, setAssetUrl] = useState("")
  const [currentPageLabel, setCurrentPageLabel] = useState("")

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
    chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      setCurrentPageLabel(getTabDisplayLabel(tab?.url))
    }).catch(() => setCurrentPageLabel(""))
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
    try {
      if (captureMode === "area") {
        await requestAreaCaptureSession("analyze")
      } else {
        await sendCurrentTabMessage({ type: "ANALYZE_PAGE" }, t)
      }
      setTimeout(() => window.close(), 200)
    } catch (err) {
      showStatus(err instanceof Error ? err.message : "Failed to start analysis", "error")
      setAnalyzing(false)
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

  async function handleAssetFile(file?: File) {
    if (!file) return
    try {
      const assetKind = detectAssetKind(file)
      if (assetKind === "unsupported") throw new Error(t.unsupportedAsset)
      if (file.size > MAX_VIDEO_SIZE_BYTES) throw new Error("Video exceeds 200MB")
      await sendCurrentTabMessage({
        ...(await buildAssetAnalysisMessage(file))
      }, t)
      setTimeout(() => window.close(), 150)
    } catch (err) {
      showStatus(err instanceof Error ? err.message : "Upload failed", "error")
    }
  }

  async function handleAssetUrl() {
    try {
      await sendCurrentTabMessage({
        type: "START_ASSET_ANALYSIS",
        assetKind: "video",
        videoUrl: assetUrl,
        fileName: assetUrl.split("/").pop() || "web-video.mp4"
      }, t)
      setTimeout(() => window.close(), 150)
    } catch (err) {
      showStatus(err instanceof Error ? err.message : "Upload failed", "error")
    }
  }

  return {
    appUrl,
    analyzing,
    captureMode,
    connectionLabel,
    connectionState,
    currentPageLabel,
    locale,
    recordingShortcut,
    serverUrl,
    settingsOpen,
    shortcutAnalyze,
    shortcutSave,
    status,
    t,
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
    triggerAnalyze
  }
}
