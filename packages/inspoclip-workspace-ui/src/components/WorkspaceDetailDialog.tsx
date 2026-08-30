import { forwardRef, useCallback, useEffect, useRef, useState, type ReactNode, type Ref } from "react"

import { WorkspaceDialogFrame } from "./WorkspaceDialogFrame"

export type WorkspaceDetailDialogProps = {
  title: string
  closeLabel: string
  onClose: () => void
  media: ReactNode
  children: ReactNode
  closeButton?: ReactNode
  /** Overrides the built-in close animation lifecycle. Apps rarely need this. */
  isClosing?: boolean | null
  className?: string
  backdropClassName?: string
  mediaColumnClassName?: string
  contentClassName?: string
  bodyClassName?: string
  closeButtonClassName?: string
  headerActions?: ReactNode
  onDragOver?: (event: React.DragEvent<HTMLDivElement>) => void
}

/**
 * Shared detail dialog shell. Apps own the portal and lifecycle, while this
 * component owns the markup and class contract used by both surfaces.
 */
export const WorkspaceDetailDialog = forwardRef<HTMLDivElement, WorkspaceDetailDialogProps>(function WorkspaceDetailDialog({
  title,
  closeLabel,
  onClose,
  media,
  children,
  closeButton,
  isClosing,
  className = "",
  backdropClassName = "",
  mediaColumnClassName = "",
  contentClassName = "",
  bodyClassName = "",
  closeButtonClassName = "",
  headerActions,
  onDragOver,
}, ref: Ref<HTMLDivElement>) {
  const [closingState, setClosingState] = useState(false)
  const closeTimer = useRef<number>()
  const isClosingControlled = isClosing !== undefined && isClosing !== null
  const closing = isClosingControlled ? Boolean(isClosing) : closingState

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || closing) return
    setClosingState(true)
  }

  const handleClose = useCallback(() => {
    if (isClosingControlled) {
      onClose()
      return
    }
    if (closing) return
    setClosingState(true)
  }, [closing, isClosingControlled, onClose])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") handleClose()
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [handleClose])

  useEffect(() => {
    if (!closing) return
    if (closeTimer.current) window.clearTimeout(closeTimer.current)
    closeTimer.current = window.setTimeout(onClose, 180)
    return () => {
      if (closeTimer.current) window.clearTimeout(closeTimer.current)
    }
  }, [closing, onClose])

  useEffect(() => () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current)
  }, [])

  useEffect(() => {
    setClosingState(false)
  }, [title])

  return (
    <div
      ref={ref}
      data-testid="workspace-detail-dialog-backdrop"
      data-dialog-overlay
      className={`workspace-dialog-backdrop workspace-fade-in ${closing ? "is-closing" : ""} ${backdropClassName}`.trim()}
      onClick={handleBackdropClick}
      onDragOver={onDragOver}
    >
      <WorkspaceDialogFrame
        className={`workspace-dialog workspace-dialog-enter ${closing ? "is-closing" : ""} ${className}`.trim()}
        headerClassName="workspace-dialog-header"
        titleClassName="workspace-dialog-title"
        bodyClassName={`workspace-dialog-body ${bodyClassName}`.trim()}
        mediaColumnClassName={`workspace-detail-media-column ${mediaColumnClassName}`.trim()}
        contentClassName={`workspace-detail-content ${contentClassName}`.trim()}
        title={title}
        closeLabel={closeLabel}
        onClose={handleClose}
        closeButtonClassName={`workspace-dialog-close ${closeButtonClassName}`.trim()}
        closeButton={closeButton}
        headerActions={headerActions}
        media={media}
      >
        {children}
      </WorkspaceDialogFrame>
    </div>
  )
})
