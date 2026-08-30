import type { ReactNode } from "react"

import { WorkspaceTagList } from "./WorkspaceTagList"

export type WorkspaceCardCaptionProps = {
  title: string
  subtitle?: ReactNode
  subtitleClassName?: string
  tags?: string[]
  className?: string
  tagsClassName?: string
}

export function WorkspaceCardCaption({
  title,
  subtitle,
  subtitleClassName = "",
  tags = [],
  className = "",
  tagsClassName = "inspoclip-card-tags"
}: WorkspaceCardCaptionProps) {
  const rootClassName = className ? `${className} inspoclip-card-caption` : "inspoclip-card-caption"

  return (
    <div className={rootClassName}>
      <strong>{title}</strong>
      {subtitle ? <span className={subtitleClassName}>{subtitle}</span> : null}
      <WorkspaceTagList tags={tags} className={tagsClassName} />
    </div>
  )
}
