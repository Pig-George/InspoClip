import type { ConnectionState, Locale, I18nMessages } from "../types"

type HeaderProps = {
  connectionLabel: string
  connectionState: ConnectionState
  locale: Locale
  t: I18nMessages
  onTestConnection: () => void
  onToggleLanguage: () => void
}

export function Header({ connectionLabel, connectionState, locale, t, onTestConnection, onToggleLanguage }: HeaderProps) {
  return (
    <div className="header">
      <div className="logo-row">
        <img src={chrome.runtime.getURL("assets/icon48.png")} alt="Logo" className="logo" />
        <div>
          <h1>InspoClip</h1>
          <p className="subtitle">{t.subtitle}</p>
        </div>
      </div>
      <div className="header-actions">
        <div className={`connection-status ${connectionState}`} title="Click to test" onClick={onTestConnection}>
          <span className="dot" />
          <span className="label">{connectionLabel}</span>
        </div>
        <button className="icon-btn" title="Switch language" onClick={onToggleLanguage}>
          <span>{locale === "en" ? "中" : "EN"}</span>
        </button>
      </div>
    </div>
  )
}
