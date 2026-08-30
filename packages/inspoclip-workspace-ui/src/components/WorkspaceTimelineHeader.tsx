import type { ReactNode } from "react"

export type WorkspaceTimelineHeaderProps = {
  title: string
  meta: ReactNode
  previousLabel: string
  nextLabel: string
  previousIcon: ReactNode
  nextIcon: ReactNode
  canGoPrevious?: boolean
  canGoNext?: boolean
  onPrevious: () => void
  onNext: () => void
}

export function WorkspaceTimelineHeader({
  title,
  meta,
  previousLabel,
  nextLabel,
  previousIcon,
  nextIcon,
  canGoPrevious = true,
  canGoNext = true,
  onPrevious,
  onNext
}: WorkspaceTimelineHeaderProps) {
  return (
    <header className="workspace-timeline-header">
      <button type="button" className="workspace-timeline-nav-button" onClick={onPrevious} disabled={!canGoPrevious} aria-label={previousLabel} title={previousLabel}>{previousIcon}</button>
      <div className="workspace-timeline-heading">
        <h2 className="workspace-timeline-title">{title}</h2>
        <p className="workspace-timeline-meta">{meta}</p>
      </div>
      <button type="button" className="workspace-timeline-nav-button" onClick={onNext} disabled={!canGoNext} aria-label={nextLabel} title={nextLabel}>{nextIcon}</button>
    </header>
  )
}
