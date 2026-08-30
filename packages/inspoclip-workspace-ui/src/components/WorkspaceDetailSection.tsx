import type { ReactNode } from "react"

export type WorkspaceDetailSectionProps = {
  title: ReactNode
  ariaLabel?: string
  children: ReactNode
  className?: string
  titleClassName?: string
  headingClassName?: string
}

export function WorkspaceDetailSection({
  title,
  ariaLabel,
  children,
  className = "workspace-detail-section workspace-detail-enter",
  headingClassName,
  titleClassName
}: WorkspaceDetailSectionProps) {
  const headingClass = headingClassName || titleClassName || "workspace-detail-heading"
  return (
    <section className={className} aria-label={ariaLabel}>
      <h3 className={headingClass}>{title}</h3>
      {children}
    </section>
  )
}
