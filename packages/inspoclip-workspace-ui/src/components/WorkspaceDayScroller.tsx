import type { CSSProperties, ReactNode, RefObject, UIEvent } from "react"

export type WorkspaceDayScrollerProps = {
  children?: ReactNode
  footer?: ReactNode
  scrollRef?: RefObject<HTMLDivElement>
  onScroll?: (event: UIEvent<HTMLDivElement>) => void
  className?: string
  style?: CSSProperties
}

export function WorkspaceDayScroller({
  children,
  footer,
  scrollRef,
  onScroll,
  className = "workspace-day-scroll",
  style
}: WorkspaceDayScrollerProps) {
  return <div ref={scrollRef} className={className} style={style} onScroll={onScroll}>{children}{footer}</div>
}
