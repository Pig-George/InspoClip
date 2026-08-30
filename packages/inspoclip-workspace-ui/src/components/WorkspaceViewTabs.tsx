import type { ReactNode } from "react"

export type WorkspaceViewMode = "day" | "week" | "timeline"

export type WorkspaceViewTabsProps = {
  value: WorkspaceViewMode
  labels: Record<WorkspaceViewMode, string>
  onChange: (mode: WorkspaceViewMode) => void
  renderIcon: (mode: WorkspaceViewMode) => ReactNode
  className?: string
  buttonClassName?: string
  activeButtonClassName?: string
  inactiveButtonClassName?: string
  ariaLabel?: string
}

export function WorkspaceViewTabs({
  value,
  labels,
  onChange,
  renderIcon,
  className = "workspace-view-tabs",
  buttonClassName = "workspace-view-tab",
  activeButtonClassName = "is-active",
  inactiveButtonClassName = "is-inactive",
  ariaLabel = "Workspace views"
}: WorkspaceViewTabsProps) {
  return (
    <div className={className} role="tablist" aria-label={ariaLabel}>
      {(["day", "week", "timeline"] as const).map((mode) => {
        const active = value === mode
        return (
          <button
            key={mode}
            type="button"
            role="tab"
            aria-label={labels[mode]}
            aria-selected={active}
            title={labels[mode]}
            className={`${buttonClassName} ${active ? activeButtonClassName : inactiveButtonClassName}`.trim()}
            onClick={() => onChange(mode)}
          >
            {renderIcon(mode)}
          </button>
        )
      })}
    </div>
  )
}
