import type { I18nMessages, ModelSettings, RuntimeMode, ShortcutTarget } from "../types"
import { formatShortcut } from "../shortcut"
import { PopupIcon } from "./PopupIcon"

type SettingsSectionProps = {
  appUrl: string
  modelSettings: ModelSettings
  open: boolean
  recordingShortcut: ShortcutTarget | null
  runtimeMode: RuntimeMode
  serverUrl: string
  shortcutAnalyze: string
  shortcutSave: string
  storageUsageLabel?: string
  t: I18nMessages
  onAppUrlChange: (value: string) => void
  onModelSettingsChange: (value: ModelSettings) => void
  onClose: () => void
  onSaveSettings: () => void | Promise<void>
  onRuntimeModeChange: (value: RuntimeMode) => void
  onServerUrlChange: (value: string) => void
  onSetShortcutAnalyze: (value: string) => void
  onSetShortcutSave: (value: string) => void
  onSetRecordingShortcut: (value: ShortcutTarget | null) => void
}

export function SettingsSection({
  appUrl,
  modelSettings,
  open,
  recordingShortcut,
  runtimeMode,
  serverUrl,
  shortcutAnalyze,
  shortcutSave,
  storageUsageLabel,
  t,
  onAppUrlChange,
  onModelSettingsChange,
  onClose,
  onSaveSettings,
  onRuntimeModeChange,
  onServerUrlChange,
  onSetShortcutAnalyze,
  onSetShortcutSave,
  onSetRecordingShortcut
}: SettingsSectionProps) {
  return (
    <section className={`settings-view ${open ? "open" : ""}`} aria-hidden={!open}>
      <div className="settings-header">
        <button className="header-icon-button" type="button" aria-label={t.settings} onClick={onClose}><PopupIcon name="arrow-left" /></button>
        <div><strong>{t.settings}</strong><span>{t.settingsDescription}</span></div>
      </div>

      <div className="settings-content">
        <div className="settings-card">
          <h3><PopupIcon name="server" />{t.runtimeMode}</h3>
          <select className="runtime-mode-select" value={runtimeMode} onChange={(event) => onRuntimeModeChange(event.target.value as RuntimeMode)}>
            <option value="standalone">{t.standaloneMode}</option>
            <option value="backend">{t.backendMode}</option>
          </select>
          {runtimeMode === "standalone" ? (
            <>
              <div className="settings-card settings-card-nested">
                <h3><PopupIcon name="sparkles" />{t.modelConfiguration}</h3>
                <label htmlFor="modelProvider">{t.modelProvider}</label>
                <select
                  className="runtime-mode-select"
                  id="modelProvider"
                  value={modelSettings.provider}
                  onChange={(event) => onModelSettingsChange({ ...modelSettings, provider: event.target.value as ModelSettings["provider"] })}
                >
                  <option value="qwen">{t.qwenProvider}</option>
                  <option value="openai-compatible">{t.openaiCompatibleProvider}</option>
                </select>
                <label htmlFor="modelEndpoint">{t.modelEndpoint}</label>
                <input id="modelEndpoint" type="url" value={modelSettings.endpoint} onChange={(event) => onModelSettingsChange({ ...modelSettings, endpoint: event.target.value })} />
                <label htmlFor="modelName">{t.modelName}</label>
                <input id="modelName" type="text" value={modelSettings.model} onChange={(event) => onModelSettingsChange({ ...modelSettings, model: event.target.value })} />
                <label htmlFor="modelApiKey">{t.apiKey}</label>
                <input id="modelApiKey" type="password" autoComplete="off" value={modelSettings.apiKey} onChange={(event) => onModelSettingsChange({ ...modelSettings, apiKey: event.target.value })} />
                <p className="settings-hint">{t.modelConfigurationHint}</p>
              </div>
              <p className="settings-hint">{t.standaloneModeHint}</p>
              <div className="storage-usage"><span>{t.localStorageUsage}</span><strong>{storageUsageLabel || "..."}</strong></div>
            </>
          ) : null}
        </div>
        {runtimeMode === "backend" ? <div className="settings-card">
          <h3><PopupIcon name="server" />{t.serviceConnection}</h3>
          <label htmlFor="serverUrl">Server URL</label>
          <input type="text" id="serverUrl" value={serverUrl} onChange={(event) => onServerUrlChange(event.target.value)} />
          <label htmlFor="appUrl">Frontend URL</label>
          <input type="text" id="appUrl" value={appUrl} onChange={(event) => onAppUrlChange(event.target.value)} />
        </div> : null}

        <div className="settings-card">
          <h3><PopupIcon name="command" />{t.shortcuts}</h3>
          <ShortcutInput
            active={recordingShortcut === "analyze"}
            label={t.areaAnalyze}
            value={shortcutAnalyze}
            onClear={() => onSetShortcutAnalyze("")}
            onFocus={() => onSetRecordingShortcut("analyze")}
            onRecord={(shortcut) => {
              onSetShortcutAnalyze(shortcut)
              onSetRecordingShortcut(null)
            }}
          />
          <ShortcutInput
            active={recordingShortcut === "save"}
            label={t.areaSave}
            value={shortcutSave}
            onClear={() => onSetShortcutSave("")}
            onFocus={() => onSetRecordingShortcut("save")}
            onRecord={(shortcut) => {
              onSetShortcutSave(shortcut)
              onSetRecordingShortcut(null)
            }}
          />
          <p className="settings-hint">{t.shortcutHint}</p>
        </div>
      </div>

      <div className="settings-footer">
        <button type="button" onClick={onSaveSettings}>{t.saveSettings}</button>
      </div>
    </section>
  )
}

type ShortcutInputProps = {
  active: boolean
  label: string
  value: string
  onClear: () => void
  onFocus: () => void
  onRecord: (value: string) => void
}

function ShortcutInput({ active, label, value, onClear, onFocus, onRecord }: ShortcutInputProps) {
  return (
    <div className="shortcut-row">
      <span className="shortcut-label">{label}</span>
      <input
        className={`shortcut-input ${active ? "recording" : ""}`}
        value={value}
        onFocus={onFocus}
        onKeyDown={(event) => {
          event.preventDefault()
          event.stopPropagation()
          const shortcut = formatShortcut(event)
          if (shortcut) onRecord(shortcut)
        }}
        readOnly
      />
      <button type="button" className="shortcut-clear" aria-label={`${label} clear`} onClick={onClear}>×</button>
    </div>
  )
}
