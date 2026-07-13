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
    assetAnalysis: "Asset Analysis",
    assetDropTitle: "Drop, paste, or choose an image/video",
    assetDropHint: "Supports images, MP4, MOV, and WebM",
    assetUrlHint: "Or analyze a public video URL",
    chooseAsset: "Choose Asset",
    analyzeAssetUrl: "Analyze",
    viewAnalysis: "View full analysis →",
    uploading: "Uploading…",
    analyzingAsset: "Analyzing asset…",
    imageAnalysisCompleted: "Image analysis completed",
    unsupportedAsset: "Unsupported asset type",
    fetchingVideo: "Fetching video…",
    waitingAnalysis: "Waiting for analysis…",
    analysisCompleted: "Analysis completed",
    starting: "Starting...",
    inaccessiblePage: "Cannot access this page. Please open a normal http/https webpage and try again.",
    inaccessibleFilePage: "Cannot access local file pages. Please open a normal http/https webpage, or enable file access for this extension in Chrome."
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
    assetAnalysis: "素材分析",
    assetDropTitle: "拖拽、粘贴或选择图片/视频",
    assetDropHint: "支持图片、MP4、MOV、WebM",
    assetUrlHint: "或分析公开视频链接",
    chooseAsset: "选择素材",
    analyzeAssetUrl: "分析",
    viewAnalysis: "查看完整分析 →",
    uploading: "上传中…",
    analyzingAsset: "正在分析素材…",
    imageAnalysisCompleted: "图片分析完成",
    unsupportedAsset: "暂不支持此素材类型",
    fetchingVideo: "获取视频…",
    waitingAnalysis: "等待分析…",
    analysisCompleted: "分析完成",
    starting: "启动中...",
    inaccessiblePage: "无法访问当前页面。请打开普通的 http/https 网页后再试。",
    inaccessibleFilePage: "无法访问本地文件页面。请打开普通的 http/https 网页，或在 Chrome 扩展管理页为此扩展开启本地文件访问权限。"
  }
}

export function detectBrowserLocale(language = navigator.language || "en"): Locale {
  return language.startsWith("zh") ? "zh" : "en"
}
