import { ActionButtons } from "./components/ActionButtons"
import { Footer } from "./components/Footer"
import { Header } from "./components/Header"
import { ModeToggle } from "./components/ModeToggle"
import { SettingsSection } from "./components/SettingsSection"
import { StatusBanner } from "./components/StatusBanner"
import { VideoSection } from "./components/VideoSection"
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
      <VideoSection
        t={popup.t}
        videoProgress={popup.videoProgress}
        videoResultUrl={popup.videoResultUrl}
        videoUrl={popup.videoUrl}
        onFileChange={popup.handleVideoFile}
        onUrlChange={popup.setVideoUrl}
        onUrlSubmit={popup.handleVideoUrl}
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
