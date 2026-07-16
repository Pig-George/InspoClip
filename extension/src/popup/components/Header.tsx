import type { ConnectionState, Locale, I18nMessages } from "../types"
import { getExtensionIconUrl } from "../services/assets"
import { PopupIcon } from "./PopupIcon"

type HeaderProps = {
  connectionLabel: string
  connectionState: ConnectionState
  locale: Locale
  t: I18nMessages
  onTestConnection: () => void
  onToggleLanguage: () => void
  onOpenSettings: () => void
}

export function Header({ connectionLabel, connectionState, locale, t, onTestConnection, onToggleLanguage, onOpenSettings }: HeaderProps) {
  return (
    <header className="popup-header">
      <div className="popup-brand">
        <img src={getExtensionIconUrl(48)} alt="Logo" className="logo" />
        <div className="popup-brand-copy">
          <strong>InspoClip</strong>
          <span>{t.subtitle}</span>
        </div>
      </div>
      <div className="popup-header-actions">
        <button className={`header-icon-button connection-button ${connectionState}`} type="button" title={connectionLabel || t.connected} aria-label={connectionLabel || t.connected} onClick={onTestConnection}>
          <PopupIcon name="radio-tower" />
          <span className="connection-dot" />
        </button>
        <button className="header-language-button" type="button" title="Switch language" aria-label="Switch language" onClick={onToggleLanguage}>
          {locale === "en" ? "中" : "EN"}
        </button>
        <button className="header-icon-button" type="button" title={t.settings} aria-label={t.settings} onClick={onOpenSettings}><PopupIcon name="settings-2" /></button>
      </div>
    </header>
  )
}
