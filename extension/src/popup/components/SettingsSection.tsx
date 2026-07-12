import type { I18nMessages, ShortcutTarget } from "../types"
import { formatShortcut } from "../shortcut"

type SettingsSectionProps = {
  appUrl: string
  recordingShortcut: ShortcutTarget | null
  serverUrl: string
  settingsOpen: boolean
  shortcutAnalyze: string
  shortcutSave: string
  t: I18nMessages
  onAppUrlChange: (value: string) => void
  onSaveSettings: () => void
  onServerUrlChange: (value: string) => void
  onSetSettingsOpen: (value: boolean | ((value: boolean) => boolean)) => void
  onSetShortcutAnalyze: (value: string) => void
  onSetShortcutSave: (value: string) => void
  onSetRecordingShortcut: (value: ShortcutTarget | null) => void
  onTestConnection: () => void
}

export function SettingsSection({
  appUrl,
  recordingShortcut,
  serverUrl,
  settingsOpen,
  shortcutAnalyze,
  shortcutSave,
  t,
  onAppUrlChange,
  onSaveSettings,
  onServerUrlChange,
  onSetSettingsOpen,
  onSetShortcutAnalyze,
  onSetShortcutSave,
  onSetRecordingShortcut,
  onTestConnection
}: SettingsSectionProps) {
  return (
    <div className="settings-section">
      <button className="settings-toggle" onClick={() => onSetSettingsOpen((value) => !value)}>
        <span className={`settings-arrow ${settingsOpen ? "open" : ""}`}>▶</span>
        <span>{t.settings}</span>
      </button>
      <div className={`settings-body-wrapper ${settingsOpen ? "open" : ""}`}>
        <div className="settings-body">
          <label htmlFor="serverUrl">Server URL</label>
          <div className="input-row">
            <input type="text" id="serverUrl" value={serverUrl} onChange={(e) => onServerUrlChange(e.target.value)} />
            <button className="btn btn-small" onClick={onTestConnection}>{t.test}</button>
          </div>
          <label htmlFor="appUrl">Frontend URL</label>
          <div className="input-row">
            <input type="text" id="appUrl" value={appUrl} onChange={(e) => onAppUrlChange(e.target.value)} />
          </div>

          <label>{t.shortcuts}</label>
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
          <p className="hint">{t.shortcutHint}</p>
          <button className="btn btn-small btn-full" onClick={onSaveSettings}>{t.saveSettings}</button>
        </div>
      </div>
    </div>
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
      <button className="btn btn-tiny" onClick={onClear}>×</button>
    </div>
  )
}
