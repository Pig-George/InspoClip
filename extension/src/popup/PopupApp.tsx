import { AssetSection } from "./components/AssetSection"
import { Footer } from "./components/Footer"
import { Header } from "./components/Header"
import { PageAnalysisSection } from "./components/PageAnalysisSection"
import { PopupContent } from "./components/PopupContent"
import { SettingsSection } from "./components/SettingsSection"
import { StatusBanner } from "./components/StatusBanner"
import { usePopupController } from "./hooks/usePopupController"

export function PopupApp() {
  const popup = usePopupController()
  const version = chrome.runtime.getManifest().version

  return (
    <div className="popup-root">
      <Header
        connectionLabel={popup.connectionLabel}
        connectionState={popup.connectionState}
        locale={popup.locale}
        t={popup.t}
        onOpenSettings={() => popup.setSettingsOpen(true)}
        onTestConnection={popup.testServerConnection}
        onToggleLanguage={popup.toggleLanguage}
      />

      <main className="popup-main">
        <PopupContent
          assetSection={(
            <AssetSection
              t={popup.t}
              assetUrl={popup.assetUrl}
              onFileSelect={popup.handleAssetFile}
              onUrlChange={popup.setAssetUrl}
              onUrlSubmit={popup.handleAssetUrl}
            />
          )}
          pageAnalysisSection={(
            <PageAnalysisSection
              analyzing={popup.analyzing}
              captureMode={popup.captureMode}
              currentPageLabel={popup.currentPageLabel || popup.t.pageUnavailable}
              shortcutAnalyze={popup.shortcutAnalyze}
              t={popup.t}
              onAnalyze={popup.triggerAnalyze}
              onChangeMode={popup.setCaptureMode}
            />
          )}
        />
      </main>

      <Footer t={popup.t} onOpenApp={popup.openApp} showWorkspaceLink={popup.runtimeMode === "backend"} />
      <StatusBanner status={popup.status} />

      <SettingsSection
        appUrl={popup.appUrl}
        modelSettings={popup.modelSettings}
        open={popup.settingsOpen}
        version={version}
        recordingShortcut={popup.recordingShortcut}
        runtimeMode={popup.runtimeMode}
        serverUrl={popup.serverUrl}
        shortcutAnalyze={popup.shortcutAnalyze}
        shortcutSave={popup.shortcutSave}
        storageUsageLabel={popup.storageUsageLabel}
        t={popup.t}
        onAppUrlChange={popup.setAppUrl}
        onModelSettingsChange={popup.setModelSettings}
        onClose={() => popup.setSettingsOpen(false)}
        onSaveSettings={async () => {
          await popup.saveSettings()
          popup.setSettingsOpen(false)
        }}
        onRuntimeModeChange={popup.setRuntimeMode}
        onServerUrlChange={popup.setServerUrl}
        onSetShortcutAnalyze={popup.setShortcutAnalyze}
        onSetShortcutSave={popup.setShortcutSave}
        onSetRecordingShortcut={popup.setRecordingShortcut}
      />
    </div>
  )
}
