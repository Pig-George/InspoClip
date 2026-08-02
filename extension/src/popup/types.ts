export type Locale = "en" | "zh"

export type CaptureMode = "area" | "page"

export type ConnectionState = "testing" | "connected" | "error"
export type RuntimeMode = "backend" | "standalone"
export type StorageUsage = { usedBytes: number; quotaBytes?: number }
export type ModelProvider = "qwen" | "openai-compatible"
export type ModelSettings = {
  provider: ModelProvider
  endpoint: string
  model: string
  apiKey: string
}

export type ShortcutTarget = "analyze" | "save"

export type StatusMessage = {
  type: "success" | "error" | "loading"
  message: string
}

export type ShortcutSettings = {
  analyze: string
  save: string
}

export type PopupSettings = {
  runtimeMode: RuntimeMode
  modelSettings: ModelSettings
  serverUrl: string
  appUrl: string
  shortcuts: ShortcutSettings
  lang?: Locale
}

export type I18nMessages = {
  subtitle: string
  fullPage: string
  areaSelect: string
  settings: string
  shortcuts: string
  areaAnalyze: string
  areaSave: string
  shortcutHint: string
  test: string
  saveSettings: string
  openInspoClip: string
  connected: string
  offline: string
  error: string
  assetAnalysis: string
  assetDropTitle: string
  assetDropHint: string
  chooseAsset: string
  analyzeAssetUrl: string
  unsupportedAsset: string
  starting: string
  inaccessiblePage: string
  inaccessibleFilePage: string
  currentPage: string
  analyzeCurrentArea: string
  analyzeFullPage: string
  areaAnalysisHint: string
  fullPageAnalysisHint: string
  fullPageOptionHint: string
  selectAnalysisScope: string
  quickAreaAnalyze: string
  assetAnalysisDescription: string
  pasteAssetHint: string
  publicVideoUrl: string
  settingsDescription: string
  serviceConnection: string
  pageUnavailable: string
  runtimeMode: string
  backendMode: string
  standaloneMode: string
  standaloneModeHint: string
  localStorageUsage: string
  localModeReady: string
  modelConfiguration: string
  modelProvider: string
  qwenProvider: string
  openaiCompatibleProvider: string
  modelEndpoint: string
  modelName: string
  apiKey: string
  modelConfigurationHint: string
}
