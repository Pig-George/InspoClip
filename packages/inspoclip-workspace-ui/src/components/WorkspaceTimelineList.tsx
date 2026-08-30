import type { ReactNode } from "react"

export type WorkspaceTimelineGroup<TItem> = {
  id: string
  label: string
  meta?: ReactNode
  items: TItem[]
}

export type WorkspaceTimelineListProps<TItem> = {
  groups: WorkspaceTimelineGroup<TItem>[]
  renderItem: (item: TItem, index: number, group: WorkspaceTimelineGroup<TItem>) => ReactNode
  empty?: ReactNode
  className?: string
  groupClassName?: string
  markerClassName?: string
  headingClassName?: string
  gridClassName?: string
  emptyClassName?: string
}

export function WorkspaceTimelineList<TItem>({
  groups,
  renderItem,
  empty = null,
  className = "workspace-timeline",
  groupClassName = "workspace-month",
  markerClassName = "workspace-month-marker",
  headingClassName = "",
  gridClassName = "workspace-card-grid",
  emptyClassName = "workspace-state workspace-empty"
}: WorkspaceTimelineListProps<TItem>) {
  const total = groups.reduce((sum, group) => sum + group.items.length, 0)
  if (!groups.length) return empty ? <div className={emptyClassName}>{empty}</div> : null

  return (
    <section className={className} data-total-assets={total}>
      {groups.map((group) => (
        <div className={groupClassName} key={group.id}>
          <div className={markerClassName} aria-hidden="true" />
          <header className={headingClassName}>
            <strong>{group.label}</strong>
            {group.meta ? <span>{group.meta}</span> : null}
          </header>
          <div className={gridClassName}>{group.items.map((item, index) => renderItem(item, index, group))}</div>
        </div>
      ))}
    </section>
  )
}
