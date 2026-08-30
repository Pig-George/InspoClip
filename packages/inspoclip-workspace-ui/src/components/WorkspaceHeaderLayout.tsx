import type { ReactNode } from "react"

export type WorkspaceHeaderLayoutProps = {
  left: ReactNode
  heading: ReactNode
  actions: ReactNode
  className?: string
  leftClassName?: string
  headingClassName?: string
  actionsClassName?: string
}

export function WorkspaceHeaderLayout({
  left,
  heading,
  actions,
  className = "workspace-header-layout",
  leftClassName = "workspace-header-left",
  headingClassName = "workspace-header-heading",
  actionsClassName = "workspace-header-actions"
}: WorkspaceHeaderLayoutProps) {
  return (
    <header className={className}>
      <div className={leftClassName}>{left}</div>
      <div className={headingClassName}>{heading}</div>
      <div className={actionsClassName}>{actions}</div>
    </header>
  )
}
