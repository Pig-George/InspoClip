import type { I18nMessages, Locale, ModelProvider, ModelSettings, ShortcutSettings } from "./types"

export const DEFAULT_SERVER_URL = "http://127.0.0.1:3001"

export const DEFAULT_APP_URL = DEFAULT_SERVER_URL.replace(/:3001$/, ":8080")

export const DEFAULT_SHORTCUTS: ShortcutSettings = {
  analyze: "Ctrl+Shift+A",
  save: "Ctrl+Shift+S"
}

export const DEFAULT_MODEL_SETTINGS = {
  provider: "qwen" as const,
  endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  model: "qwen3.7-plus",
  apiKey: "",
  videoFrameCount: 16
}

export const MODEL_PROVIDER_PRESETS: Record<ModelProvider, Pick<ModelSettings, "provider" | "endpoint" | "model">> = {
  qwen: {
    provider: "qwen",
    endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    model: "qwen3.7-plus"
  },
  openai: {
    provider: "openai",
    endpoint: "https://api.openai.com/v1",
    model: "gpt-4.1-mini"
  },
  openrouter: {
    provider: "openrouter",
    endpoint: "https://openrouter.ai/api/v1",
    model: "openai/gpt-4.1-mini"
  },
  "openai-compatible": {
    provider: "openai-compatible",
    endpoint: "",
    model: ""
  }
}

export const MAX_VIDEO_SIZE_BYTES = 200 * 1024 * 1024

export const I18N: Record<Locale, I18nMessages> = {
  en: {
    subtitle: "Design Inspiration Saver",
    fullPage: "Full page",
    areaSelect: "Area selection",
    settings: "Settings",
    shortcuts: "Keyboard Shortcuts",
    areaAnalyze: "Area Analyze",
    areaSave: "Area Save",
    shortcutHint: "Click input then press your desired key combo",
    test: "Test",
    saveSettings: "Save Settings",
    openInspoClip: "Open InspoClip →",
    connected: "Connected",
    offline: "Offline",
    error: "Error",
    assetAnalysis: "Asset Analysis",
    assetDropTitle: "Drop, paste, or choose an image/video",
    assetDropHint: "Supports images, MP4, MOV, and WebM",
    chooseAsset: "Choose Asset",
    analyzeAssetUrl: "Analyze",
    unsupportedAsset: "Unsupported asset type",
    starting: "Starting...",
    inaccessiblePage: "Cannot access this page. Please open a normal http/https webpage and try again.",
    inaccessibleFilePage: "Cannot access local file pages. Please open a normal http/https webpage, or enable file access for this extension in Chrome.",
    currentPage: "Current page",
    analyzeCurrentArea: "Analyze current area",
    analyzeFullPage: "Analyze full page",
    areaAnalysisHint: "Select an area, then choose screenshot or recording",
    fullPageAnalysisHint: "Understand the complete visual content of this page",
    fullPageOptionHint: "Analyze all visible page content",
    selectAnalysisScope: "Select analysis scope",
    quickAreaAnalyze: "Quick area analysis",
    assetAnalysisDescription: "Paste, drop, or choose an asset. Results open on the current page.",
    pasteAssetHint: "You can also press Ctrl + V to paste a clipboard asset",
    publicVideoUrl: "Analyze a public video URL",
    settingsDescription: "Connection addresses and keyboard shortcuts",
    serviceConnection: "Service connection",
    pageUnavailable: "Current page",
    runtimeMode: "Runtime mode",
    backendMode: "Backend service",
    standaloneMode: "Local mode",
    standaloneModeHint: "Assets stay in this browser.",
    localStorageUsage: "Local storage",
    localModeReady: "Local storage ready",
    modelConfiguration: "AI model",
    modelProvider: "Model provider",
    bailianProvider: "Alibaba Cloud Model Studio",
    openaiProvider: "OpenAI",
    openrouterProvider: "OpenRouter",
    openaiCompatibleProvider: "Other OpenAI-compatible service",
    modelEndpoint: "API endpoint",
    modelName: "Model name",
    apiKey: "API key",
    videoFrameCount: "Video analysis frames",
    videoFrameCountHint: "Used for non-Bailian providers and as a fallback when full-video analysis is unavailable (4-48).",
    developmentDiagnostics: "Extension logs",
    developmentDiagnosticsEmpty: "No extension logs recorded.",
    copyDiagnostics: "Copy extension logs",
    clearDiagnostics: "Clear extension logs",
    modelConfigurationHint: "Stored only in this browser and used by standalone analysis."
  },
  zh: {
    subtitle: "设计灵感剪贴簿",
    fullPage: "完整页面",
    areaSelect: "区域框选",
    settings: "设置",
    shortcuts: "快捷键",
    areaAnalyze: "区域分析",
    areaSave: "区域保存",
    shortcutHint: "点击输入框后按下想要的快捷键组合",
    test: "测试",
    saveSettings: "保存设置",
    openInspoClip: "打开 InspoClip →",
    connected: "已连接",
    offline: "离线",
    error: "错误",
    assetAnalysis: "素材分析",
    assetDropTitle: "拖拽、粘贴或选择图片/视频",
    assetDropHint: "支持图片、MP4、MOV、WebM",
    chooseAsset: "选择素材",
    analyzeAssetUrl: "分析",
    unsupportedAsset: "暂不支持此素材类型",
    starting: "启动中...",
    inaccessiblePage: "无法访问当前页面。请打开普通的 http/https 网页后再试。",
    inaccessibleFilePage: "无法访问本地文件页面。请打开普通的 http/https 网页，或在 Chrome 扩展管理页为此扩展开启本地文件访问权限。",
    currentPage: "当前页面",
    analyzeCurrentArea: "分析当前区域",
    analyzeFullPage: "分析完整页面",
    areaAnalysisHint: "框选后选择截图或录屏",
    fullPageAnalysisHint: "理解当前页面的完整视觉内容",
    fullPageOptionHint: "分析整页内容",
    selectAnalysisScope: "选择分析范围",
    quickAreaAnalyze: "快速启动区域分析",
    assetAnalysisDescription: "粘贴、拖拽或选择素材，结果会在当前网页右侧打开。",
    pasteAssetHint: "也可以直接按 Ctrl + V 粘贴剪贴板素材",
    publicVideoUrl: "通过公开视频链接分析",
    settingsDescription: "连接地址与快捷键",
    serviceConnection: "服务连接",
    pageUnavailable: "当前页面",
    runtimeMode: "运行模式",
    backendMode: "后端服务",
    standaloneMode: "独立运行",
    standaloneModeHint: "素材保存在当前浏览器。",
    localStorageUsage: "本地存储",
    localModeReady: "本地存储已就绪",
    modelConfiguration: "大模型配置",
    modelProvider: "模型供应商",
    bailianProvider: "阿里云百炼",
    openaiProvider: "OpenAI",
    openrouterProvider: "OpenRouter",
    openaiCompatibleProvider: "其他 OpenAI 兼容服务",
    modelEndpoint: "接口地址",
    modelName: "模型名称",
    apiKey: "API Key",
    videoFrameCount: "视频分析帧数",
    videoFrameCountHint: "用于非百炼供应商，以及完整视频分析不可用时的降级处理（4–48 帧）。",
    developmentDiagnostics: "插件日志",
    developmentDiagnosticsEmpty: "暂无插件日志。",
    copyDiagnostics: "复制插件日志",
    clearDiagnostics: "清空插件日志",
    modelConfigurationHint: "仅保存在当前浏览器，用于独立模式分析。"
  }
}

export function detectBrowserLocale(language = navigator.language || "en"): Locale {
  return language.startsWith("zh") ? "zh" : "en"
}
