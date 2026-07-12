import type { I18nMessages, Locale, ShortcutSettings } from "./types"

export const DEFAULT_SERVER_URL = "http://localhost:3001"

export const DEFAULT_APP_URL = DEFAULT_SERVER_URL.replace(/:3001$/, ":8080")

export const DEFAULT_SHORTCUTS: ShortcutSettings = {
  analyze: "Ctrl+Shift+A",
  save: "Ctrl+Shift+S"
}

export const MAX_VIDEO_SIZE_BYTES = 200 * 1024 * 1024

export const I18N: Record<Locale, I18nMessages> = {
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
    viewAnalysis: "View full analysis →",
    uploading: "Uploading…",
    fetchingVideo: "Fetching video…",
    waitingAnalysis: "Waiting for analysis…",
    analysisCompleted: "Analysis completed",
    starting: "Starting..."
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
    viewAnalysis: "查看完整分析 →",
    uploading: "上传中…",
    fetchingVideo: "获取视频…",
    waitingAnalysis: "等待分析…",
    analysisCompleted: "分析完成",
    starting: "启动中..."
  }
}

export function detectBrowserLocale(language = navigator.language || "en"): Locale {
  return language.startsWith("zh") ? "zh" : "en"
}
