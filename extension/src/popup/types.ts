export type Locale = "en" | "zh"

export type CaptureMode = "area" | "page"

export type ConnectionState = "testing" | "connected" | "error"

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
  serverUrl: string
  appUrl: string
  shortcuts: ShortcutSettings
  lang?: Locale
}

export type I18nMessages = {
  subtitle: string
  analyzePage: string
  quickSave: string
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
  saving: string
  connected: string
  offline: string
  error: string
  assetAnalysis: string
  assetDropTitle: string
  assetDropHint: string
  assetUrlHint: string
  chooseAsset: string
  analyzeAssetUrl: string
  viewAnalysis: string
  uploading: string
  analyzingAsset: string
  imageAnalysisCompleted: string
  unsupportedAsset: string
  fetchingVideo: string
  waitingAnalysis: string
  analysisCompleted: string
  starting: string
  inaccessiblePage: string
  inaccessibleFilePage: string
}
