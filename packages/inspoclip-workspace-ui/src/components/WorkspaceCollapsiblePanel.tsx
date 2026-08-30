import type { ReactNode } from "react"

export type WorkspaceCollapsiblePanelProps = {
  open: boolean
  label: ReactNode
  children?: ReactNode
  onOpenChange: (open: boolean) => void
  className?: string
  headingClassName?: string
  labelClassName?: string
  icon?: ReactNode
  meta?: ReactNode
}

export function WorkspaceCollapsiblePanel({
  open,
  label,
  children,
  onOpenChange,
  className = "",
  headingClassName = "",
  labelClassName = "",
  icon,
  meta
}: WorkspaceCollapsiblePanelProps) {
  return (
    <section className={className}>
      <button type="button" className={headingClassName} onClick={() => onOpenChange(!open)} aria-expanded={open}>
        <span className={labelClassName}>{icon}{label}</span>
        {meta}
      </button>
      {open ? children : null}
    </section>
  )
}
