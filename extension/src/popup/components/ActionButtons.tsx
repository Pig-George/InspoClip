import type { I18nMessages } from "../types"

type ActionButtonsProps = {
  analyzing: boolean
  saving: boolean
  t: I18nMessages
  onAnalyze: () => void
  onSave: () => void
}

export function ActionButtons({ analyzing, saving, t, onAnalyze, onSave }: ActionButtonsProps) {
  return (
    <div className="actions">
      <button disabled={analyzing} onClick={onAnalyze} className="btn btn-primary">
        {analyzing ? <span className="spinner" /> : <span className="btn-icon">🔍</span>}
        <span>{analyzing ? t.starting : t.analyzePage}</span>
      </button>
      <button disabled={saving} onClick={onSave} className="btn btn-secondary">
        {saving ? <span className="spinner" /> : <span className="btn-icon">📷</span>}
        <span>{saving ? t.saving : t.quickSave}</span>
      </button>
    </div>
  )
}
