import { ActionButtons } from "./components/ActionButtons"
import { AssetSection } from "./components/AssetSection"
import { Footer } from "./components/Footer"
import { Header } from "./components/Header"
import { ModeToggle } from "./components/ModeToggle"
import { SettingsSection } from "./components/SettingsSection"
import { StatusBanner } from "./components/StatusBanner"
import { usePopupController } from "./hooks/usePopupController"

export function PopupApp() {
  const popup = usePopupController()

  return (
    <div className="container">
      <Header
        connectionLabel={popup.connectionLabel}
        connectionState={popup.connectionState}
        locale={popup.locale}
        t={popup.t}
        onTestConnection={popup.testServerConnection}
        onToggleLanguage={popup.toggleLanguage}
      />
      <StatusBanner status={popup.status} />
      <ModeToggle captureMode={popup.captureMode} t={popup.t} onChange={popup.setCaptureMode} />
      <ActionButtons
        analyzing={popup.analyzing}
        saving={popup.saving}
        t={popup.t}
        onAnalyze={popup.triggerAnalyze}
        onSave={popup.triggerSave}
      />
      <AssetSection
        t={popup.t}
        assetUrl={popup.assetUrl}
        onFileSelect={popup.handleAssetFile}
        onUrlChange={popup.setAssetUrl}
        onUrlSubmit={popup.handleAssetUrl}
      />
      <SettingsSection
        appUrl={popup.appUrl}
        recordingShortcut={popup.recordingShortcut}
        serverUrl={popup.serverUrl}
        settingsOpen={popup.settingsOpen}
        shortcutAnalyze={popup.shortcutAnalyze}
        shortcutSave={popup.shortcutSave}
        t={popup.t}
        onAppUrlChange={popup.setAppUrl}
        onSaveSettings={popup.saveSettings}
        onServerUrlChange={popup.setServerUrl}
        onSetSettingsOpen={popup.setSettingsOpen}
        onSetShortcutAnalyze={popup.setShortcutAnalyze}
        onSetShortcutSave={popup.setShortcutSave}
        onSetRecordingShortcut={popup.setRecordingShortcut}
        onTestConnection={popup.testServerConnection}
      />
      <Footer t={popup.t} onOpenApp={popup.openApp} />
    </div>
  )
}
