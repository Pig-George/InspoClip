import { forwardRef, type ReactNode, type Ref } from "react"

export type WorkspaceConfirmDialogProps = {
  title: string
  description: string
  cancelLabel: string
  confirmLabel: string
  icon?: ReactNode
  onCancel: () => void
  onConfirm: () => void
  pending?: boolean
  className?: string
}

/** Shared confirmation dialog markup. Apps own portal and transition lifecycle. */
export const WorkspaceConfirmDialog = forwardRef<HTMLDivElement, WorkspaceConfirmDialogProps>(function WorkspaceConfirmDialog({
  title,
  description,
  cancelLabel,
  confirmLabel,
  icon,
  onCancel,
  onConfirm,
  pending = false,
  className = ""
}, ref: Ref<HTMLDivElement>) {
  return (
    <div ref={ref} data-dialog-overlay className={`workspace-confirm-backdrop ${className}`.trim()} onClick={onCancel}>
      <section className="workspace-confirm-dialog" role="alertdialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()}>
        <div className="workspace-confirm-summary">
          {icon ? <span className="workspace-confirm-icon">{icon}</span> : null}
          <div>
            <h3>{title}</h3>
            <p>{description}</p>
          </div>
        </div>
        <div className="workspace-confirm-actions">
          <button type="button" className="workspace-confirm-cancel" onClick={onCancel} disabled={pending}>{cancelLabel}</button>
          <button type="button" className="workspace-confirm-danger" onClick={onConfirm} disabled={pending}>{confirmLabel}</button>
        </div>
      </section>
    </div>
  )
})
