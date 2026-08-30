import type { ReactNode } from "react"

export type WorkspaceDetailSaveActionProps = {
  saved: boolean
  saveLabel: string
  savedLabel: string
  saveIcon?: ReactNode
  savedIcon?: ReactNode
  onSave?: () => void
  disabled?: boolean
  className?: string
}

/** Shared persistence affordance used by detail dialogs. */
export function WorkspaceDetailSaveAction({
  saved,
  saveLabel,
  savedLabel,
  saveIcon,
  savedIcon = saveIcon,
  onSave,
  disabled = false,
  className = ""
}: WorkspaceDetailSaveActionProps) {
  const stateClassName = saved ? "workspace-detail-save is-saved" : "workspace-detail-save"
  return (
    <div className={`${stateClassName} ${className}`.trim()}>
      {saved ? <>{savedIcon}{savedLabel}</> : <button type="button" onClick={onSave} disabled={disabled || !onSave}>{saveIcon}{saveLabel}</button>}
    </div>
  )
}
