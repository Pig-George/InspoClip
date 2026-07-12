import type { CaptureMode, I18nMessages } from "../types"

type ModeToggleProps = {
  captureMode: CaptureMode
  t: I18nMessages
  onChange: (mode: CaptureMode) => void
}

export function ModeToggle({ captureMode, t, onChange }: ModeToggleProps) {
  return (
    <div className="mode-toggle">
      <button className={`mode-btn ${captureMode === "area" ? "active" : ""}`} onClick={() => onChange("area")}>
        <span className="mode-icon">✂️</span>
        <span>{t.areaSelect}</span>
      </button>
      <button className={`mode-btn ${captureMode === "page" ? "active" : ""}`} onClick={() => onChange("page")}>
        <span className="mode-icon">🖼️</span>
        <span>{t.fullPage}</span>
      </button>
    </div>
  )
}
