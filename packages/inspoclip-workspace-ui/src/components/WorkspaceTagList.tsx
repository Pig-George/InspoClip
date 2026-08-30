import type { ReactNode } from "react"

export type WorkspaceTagListProps = {
  tags: string[]
  className?: string
  tagClassName?: string
  renderTag?: (tag: string, index: number) => ReactNode
}

export function WorkspaceTagList({
  tags,
  className = "",
  tagClassName = "",
  renderTag
}: WorkspaceTagListProps) {
  if (!tags.length) return null
  return (
    <div className={className} data-workspace-tag-list>
      {tags.map((tag, index) => renderTag ? renderTag(tag, index) : <em key={`${tag}-${index}`} className={tagClassName}>{tag}</em>)}
    </div>
  )
}
