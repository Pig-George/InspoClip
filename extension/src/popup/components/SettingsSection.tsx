import type { I18nMessages, RuntimeMode, ShortcutTarget } from "../types"
import { formatShortcut } from "../shortcut"
import { PopupIcon } from "./PopupIcon"

type SettingsSectionProps = {
  appUrl: string
  open: boolean
  recordingShortcut: ShortcutTarget | null
  runtimeMode: RuntimeMode
  serverUrl: string
  shortcutAnalyze: string
  shortcutSave: string
  storageUsageLabel?: string
  t: I18nMessages
  onAppUrlChange: (value: string) => void
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
  open,
  recordingShortcut,
  runtimeMode,
  serverUrl,
  shortcutAnalyze,
  shortcutSave,
  storageUsageLabel,
  t,
  onAppUrlChange,
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
              <p className="settings-hint">{t.standaloneModeHint}</p>
              <div className="storage-usage"><span>{t.localStorageUsage}</span><strong>{storageUsageLabel || "..."}</strong></div>
            </>
          ) : null}
        </div>
        <div className="settings-card">
          <h3><PopupIcon name="server" />{t.serviceConnection}</h3>
          <label htmlFor="serverUrl">Server URL</label>
          <input type="text" id="serverUrl" value={serverUrl} onChange={(event) => onServerUrlChange(event.target.value)} />
          <label htmlFor="appUrl">Frontend URL</label>
          <input type="text" id="appUrl" value={appUrl} onChange={(event) => onAppUrlChange(event.target.value)} />
        </div>

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
