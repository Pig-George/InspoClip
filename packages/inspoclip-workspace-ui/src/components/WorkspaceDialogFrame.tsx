import type { ReactNode } from "react"

export type WorkspaceDialogFrameProps = {
  title: string
  closeLabel: string
  onClose: () => void
  media: ReactNode
  children: ReactNode
  kindLabel?: string
  className?: string
  headerClassName?: string
  titleClassName?: string
  kindLabelClassName?: string
  bodyClassName?: string
  mediaColumnClassName?: string
  contentClassName?: string
  closeButtonClassName?: string
  closeButton?: ReactNode
  headerActions?: ReactNode
}

export function WorkspaceDialogFrame({
  title,
  closeLabel,
  onClose,
  media,
  children,
  kindLabel,
  className = "",
  headerClassName = "",
  titleClassName = "",
  kindLabelClassName = "",
  bodyClassName = "",
  mediaColumnClassName = "",
  contentClassName = "",
  closeButtonClassName = "",
  closeButton,
  headerActions
}: WorkspaceDialogFrameProps) {
  return (
    <section className={className} role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()}>
      <div className={mediaColumnClassName} data-workspace-dialog-media>{media}</div>
      <div className={contentClassName} data-workspace-dialog-sidebar>
        <header className={headerClassName}>
          <div>
            {kindLabel ? <span className={kindLabelClassName}>{kindLabel}</span> : null}
            <h2 className={titleClassName}>{title}</h2>
          </div>
          <div className="workspace-dialog-actions">
            {headerActions}
            <button type="button" className={closeButtonClassName} onClick={onClose} title={closeLabel} aria-label={closeLabel}>
              {closeButton || closeLabel}
            </button>
          </div>
        </header>
        <div className={bodyClassName} data-workspace-dialog-body>{children}</div>
      </div>
    </section>
  )
}
