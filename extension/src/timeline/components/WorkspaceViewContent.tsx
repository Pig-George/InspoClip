import type { ReactNode } from "react"

import type { ViewMode } from "../types"

type WorkspaceViewContentProps = {
  hasContent: boolean
  viewMode: ViewMode
  day: ReactNode
  week: ReactNode
  timeline: ReactNode
}

export function WorkspaceViewContent({ hasContent, viewMode, day, week, timeline }: WorkspaceViewContentProps) {
  if (!hasContent) return null
  if (viewMode === "day") return <>{day}</>
  if (viewMode === "week") return <>{week}</>
  return <>{timeline}</>
}
