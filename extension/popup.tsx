import React, { useEffect, useMemo, useState } from "react"

import { buildClientVideoUrl, pollVideoJob, uploadVideoBlob } from "./src/video"

import "./src/popup/style.css"

const DEFAULT_SERVER = "http://localhost:3001"

const I18N = {
  en: {
    subtitle: "Design Inspiration Saver",
    analyzePage: "Analyze",
    quickSave: "Quick Save",
    fullPage: "Full Page",
    areaSelect: "Area Select",
    settings: "Settings",
    shortcuts: "Keyboard Shortcuts",
    areaAnalyze: "Area Analyze",
    areaSave: "Area Save",
    shortcutHint: "Click input then press your desired key combo",
    test: "Test",
    saveSettings: "Save Settings",
    openInspoClip: "Open InspoClip →",
    saving: "Saving...",
    connected: "Connected",
    offline: "Offline",
    error: "Error",
    uploadVideo: "UI Video Analysis",
    analyzeVideo: "Analyze",
    viewAnalysis: "View full analysis →"
  },
  zh: {
    subtitle: "设计灵感剪贴簿",
    analyzePage: "分析",
    quickSave: "快速保存",
    fullPage: "整页",
    areaSelect: "区域",
    settings: "设置",
    shortcuts: "快捷键",
    areaAnalyze: "区域分析",
    areaSave: "区域保存",
    shortcutHint: "点击输入框后按下想要的快捷键组合",
    test: "测试",
    saveSettings: "保存设置",
    openInspoClip: "打开 InspoClip →",
    saving: "保存中...",
    connected: "已连接",
    offline: "离线",
    error: "错误",
    uploadVideo: "UI 视频分析",
    analyzeVideo: "分析",
    viewAnalysis: "查看完整分析 →"
  }
}

type Locale = keyof typeof I18N
type CaptureMode = "area" | "page"
type ConnectionState = "testing" | "connected" | "error"

function Popup() {
  const browserLocale: Locale = (navigator.language || "en").startsWith("zh") ? "zh" : "en"
  const [locale, setLocale] = useState<Locale>(browserLocale)
  const [serverUrl, setServerUrl] = useState(DEFAULT_SERVER)
  const [appUrl, setAppUrl] = useState(DEFAULT_SERVER.replace(/:3001$/, ":8080"))
  const [captureMode, setCaptureMode] = useState<CaptureMode>("area")
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [connectionState, setConnectionState] = useState<ConnectionState>("testing")
  const [connectionLabel, setConnectionLabel] = useState("")
  const [status, setStatus] = useState<{ type: "success" | "error" | "loading"; message: string } | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [shortcutAnalyze, setShortcutAnalyze] = useState("Ctrl+Shift+A")
  const [shortcutSave, setShortcutSave] = useState("Ctrl+Shift+S")
  const [recordingShortcut, setRecordingShortcut] = useState<"analyze" | "save" | null>(null)
  const [videoUrl, setVideoUrl] = useState("")
  const [videoProgress, setVideoProgress] = useState("")
  const [videoResultUrl, setVideoResultUrl] = useState("")

  const t = useMemo(() => I18N[locale], [locale])

  useEffect(() => {
    chrome.storage.sync.get(["serverUrl", "appUrl", "shortcuts", "lang"]).then((result) => {
      const loadedServerUrl = result.serverUrl || DEFAULT_SERVER
      setServerUrl(loadedServerUrl)
      setAppUrl(result.appUrl || loadedServerUrl.replace(/:3001$/, ":8080"))
      if (result.lang) setLocale(result.lang)
      if (result.shortcuts) {
        setShortcutAnalyze(result.shortcuts.analyze || "Ctrl+Shift+A")
        setShortcutSave(result.shortcuts.save || "Ctrl+Shift+S")
      }
    })
  }, [])

  useEffect(() => {
    testServerConnection()
  }, [serverUrl, locale])

  async function testServerConnection() {
    setConnectionState("testing")
    setConnectionLabel("...")
    try {
      const res = await fetch(`${serverUrl}/api/health`, { signal: AbortSignal.timeout(3000) })
      if (res.ok) {
        setConnectionState("connected")
        setConnectionLabel(t.connected)
        setTimeout(() => setConnectionLabel(""), 3000)
      } else {
        setConnectionState("error")
        setConnectionLabel(t.error)
      }
    } catch {
      setConnectionState("error")
      setConnectionLabel(t.offline)
    }
  }

  async function toggleLanguage() {
    const next = locale === "en" ? "zh" : "en"
    setLocale(next)
    await chrome.storage.sync.set({ lang: next })
  }

  async function openApp(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault()
    const appOrigin = new URL(appUrl).origin
    const tabs = await chrome.tabs.query({})
    const existing = tabs.find((tab) => tab.url && tab.url.startsWith(appOrigin))
    if (existing?.id && existing.windowId) {
      await chrome.tabs.update(existing.id, { active: true })
      await chrome.windows.update(existing.windowId, { focused: true })
    } else {
      await chrome.tabs.create({ url: appUrl })
    }
  }

  async function sendCurrentTabMessage(message: unknown) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id) throw new Error("No active tab")
    await chrome.tabs.sendMessage(tab.id, message)
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

  async function saveSettings() {
    const normalizedServerUrl = serverUrl.trim().replace(/\/$/, "") || DEFAULT_SERVER
    const normalizedAppUrl = appUrl.trim().replace(/\/$/, "") || normalizedServerUrl.replace(/:3001$/, ":8080")
    setServerUrl(normalizedServerUrl)
    setAppUrl(normalizedAppUrl)
    await chrome.storage.sync.set({
      serverUrl: normalizedServerUrl,
      appUrl: normalizedAppUrl,
      shortcuts: { analyze: shortcutAnalyze.trim(), save: shortcutSave.trim() }
    })
    await testServerConnection()
  }

  function showStatus(message: string, type: "success" | "error" | "loading") {
    setStatus({ message, type })
    setTimeout(() => setStatus(null), 3000)
  }

  function buildShortcut(e: React.KeyboardEvent<HTMLInputElement>) {
    e.preventDefault()
    e.stopPropagation()
    if (["Control", "Shift", "Alt", "Meta"].includes(e.key)) return null

    const parts: string[] = []
    if (e.ctrlKey) parts.push("Ctrl")
    if (e.altKey) parts.push("Alt")
    if (e.shiftKey) parts.push("Shift")
    if (e.metaKey) parts.push("Meta")

    let key = e.key
    if (key === " ") key = "Space"
    else if (key === "ArrowUp") key = "Up"
    else if (key === "ArrowDown") key = "Down"
    else if (key === "ArrowLeft") key = "Left"
    else if (key === "ArrowRight") key = "Right"
    else if (key.length === 1) key = key.toUpperCase()

    parts.push(key)
    return parts.join("+")
  }

  async function trackVideo(result: { videoId: string; jobId: string }) {
    setVideoProgress(locale === "zh" ? "等待分析…" : "Waiting for analysis…")
    setVideoResultUrl("")
    const job = await pollVideoJob<{ status: string; progress?: number; errorMessage?: string }>(fetch, serverUrl, result.jobId, {
      onUpdate: (value) => setVideoProgress(`${value.status} · ${value.progress || 0}%`)
    })
    if (job.status === "failed") throw new Error(job.errorMessage || "Video analysis failed")
    setVideoProgress(locale === "zh" ? "分析完成" : "Analysis completed")
    setVideoResultUrl(buildClientVideoUrl(appUrl, result.videoId))
  }

  async function handleVideoFile(file?: File) {
    if (!file) return
    setVideoProgress(locale === "zh" ? "上传中…" : "Uploading…")
    try {
      if (file.size > 200 * 1024 * 1024) throw new Error("Video exceeds 200MB")
      await trackVideo(await uploadVideoBlob<{ videoId: string; jobId: string }>(fetch, serverUrl, file, file.name))
    } catch (err) {
      setVideoProgress(err instanceof Error ? err.message : "Upload failed")
    }
  }

  async function handleVideoUrl() {
    setVideoProgress(locale === "zh" ? "获取视频…" : "Fetching video…")
    try {
      const response = await chrome.runtime.sendMessage({ type: "UPLOAD_VIDEO_URL", url: videoUrl, serverUrl })
      if (!response?.success) throw new Error(response?.error || "Upload failed")
      await trackVideo(response)
    } catch (err) {
      setVideoProgress(err instanceof Error ? err.message : "Upload failed")
    }
  }

  return (
    <div className="container">
      <div className="header">
        <div className="logo-row">
          <img src={chrome.runtime.getURL("assets/icon48.png")} alt="Logo" className="logo" />
          <div>
            <h1>InspoClip</h1>
            <p className="subtitle">{t.subtitle}</p>
          </div>
        </div>
        <div className="header-actions">
          <div className={`connection-status ${connectionState}`} title="Click to test" onClick={testServerConnection}>
            <span className="dot" />
            <span className="label">{connectionLabel}</span>
          </div>
          <button className="icon-btn" title="Switch language" onClick={toggleLanguage}>
            <span>{locale === "en" ? "中" : "EN"}</span>
          </button>
        </div>
      </div>

      <div className={`status ${status ? `${status.type} visible` : ""}`}>{status?.message}</div>

      <div className="mode-toggle">
        <button className={`mode-btn ${captureMode === "area" ? "active" : ""}`} onClick={() => setCaptureMode("area")}>
          <span className="mode-icon">✂️</span>
          <span>{t.areaSelect}</span>
        </button>
        <button className={`mode-btn ${captureMode === "page" ? "active" : ""}`} onClick={() => setCaptureMode("page")}>
          <span className="mode-icon">🖼️</span>
          <span>{t.fullPage}</span>
        </button>
      </div>

      <div className="actions">
        <button disabled={analyzing} onClick={triggerAnalyze} className="btn btn-primary">
          {analyzing ? <span className="spinner" /> : <span className="btn-icon">🔍</span>}
          <span>{analyzing ? "Starting..." : t.analyzePage}</span>
        </button>
        <button disabled={saving} onClick={triggerSave} className="btn btn-secondary">
          {saving ? <span className="spinner" /> : <span className="btn-icon">📷</span>}
          <span>{saving ? t.saving : t.quickSave}</span>
        </button>
      </div>

      <div className="video-section">
        <div className="video-title">🎬 <span>{t.uploadVideo}</span></div>
        <input type="file" accept="video/mp4,video/quicktime,video/webm" onChange={(e) => handleVideoFile(e.currentTarget.files?.[0])} />
        <div className="input-row video-url-row">
          <input type="url" placeholder="https://example.com/demo.mp4" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} />
          <button className="btn btn-small" onClick={handleVideoUrl}>{t.analyzeVideo}</button>
        </div>
        <div className="video-progress">{videoProgress}</div>
        <a className="video-result-link" href={videoResultUrl || "#"} hidden={!videoResultUrl}>{t.viewAnalysis}</a>
      </div>

      <div className="settings-section">
        <button className="settings-toggle" onClick={() => setSettingsOpen((value) => !value)}>
          <span className={`settings-arrow ${settingsOpen ? "open" : ""}`}>▶</span>
          <span>{t.settings}</span>
        </button>
        <div className={`settings-body-wrapper ${settingsOpen ? "open" : ""}`}>
          <div className="settings-body">
            <label htmlFor="serverUrl">Server URL</label>
            <div className="input-row">
              <input type="text" id="serverUrl" value={serverUrl} onChange={(e) => setServerUrl(e.target.value)} />
              <button className="btn btn-small" onClick={testServerConnection}>{t.test}</button>
            </div>
            <label htmlFor="appUrl">Frontend URL</label>
            <div className="input-row">
              <input type="text" id="appUrl" value={appUrl} onChange={(e) => setAppUrl(e.target.value)} />
            </div>

            <label>{t.shortcuts}</label>
            <div className="shortcut-row">
              <span className="shortcut-label">{t.areaAnalyze}</span>
              <input
                className={`shortcut-input ${recordingShortcut === "analyze" ? "recording" : ""}`}
                value={shortcutAnalyze}
                onFocus={() => setRecordingShortcut("analyze")}
                onKeyDown={(e) => {
                  const shortcut = buildShortcut(e)
                  if (shortcut) {
                    setShortcutAnalyze(shortcut)
                    setRecordingShortcut(null)
                  }
                }}
                readOnly
              />
              <button className="btn btn-tiny" onClick={() => setShortcutAnalyze("")}>×</button>
            </div>
            <div className="shortcut-row">
              <span className="shortcut-label">{t.areaSave}</span>
              <input
                className={`shortcut-input ${recordingShortcut === "save" ? "recording" : ""}`}
                value={shortcutSave}
                onFocus={() => setRecordingShortcut("save")}
                onKeyDown={(e) => {
                  const shortcut = buildShortcut(e)
                  if (shortcut) {
                    setShortcutSave(shortcut)
                    setRecordingShortcut(null)
                  }
                }}
                readOnly
              />
              <button className="btn btn-tiny" onClick={() => setShortcutSave("")}>×</button>
            </div>
            <p className="hint">{t.shortcutHint}</p>
            <button className="btn btn-small btn-full" onClick={saveSettings}>{t.saveSettings}</button>
          </div>
        </div>
      </div>

      <div className="footer">
        <a href="#" onClick={openApp}>{t.openInspoClip}</a>
      </div>
    </div>
  )
}

export default Popup
