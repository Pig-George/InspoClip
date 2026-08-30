import type { CSSProperties, ReactNode } from "react"

import { WorkspaceDayHeader } from "./WorkspaceDayHeader"

export type WorkspaceDayColumnProps = {
  isoDate?: string
  dataDayColumn?: boolean
  weekdayLabel?: string
  dateLabel?: string
  count?: number
  isToday?: boolean
  todayLabel?: string
  children?: ReactNode
  footer?: ReactNode
  className?: string
  style?: CSSProperties
  headerClassName?: string
  contentClassName?: string
  footerClassName?: string
  headerContentClassName?: string
  headerTitleClassName?: string
  headerDateClassName?: string
  headerTodayClassName?: string
  countClassName?: string
}

export function WorkspaceDayColumn({
  isoDate,
  dataDayColumn = false,
  weekdayLabel,
  dateLabel,
  count = 0,
  isToday = false,
  todayLabel,
  children,
  footer,
  className = "",
  style,
  headerClassName = "",
  contentClassName = "workspace-day-content",
  footerClassName = "workspace-day-footer",
  headerContentClassName = "",
  headerTitleClassName = "",
  headerDateClassName = "",
  headerTodayClassName = "",
  countClassName = "workspace-day-count"
}: WorkspaceDayColumnProps) {
  return (
    <article
      data-date={isoDate}
      data-day-column={dataDayColumn ? "" : undefined}
      className={["workspace-day-column", className, isToday ? "is-today" : ""].filter(Boolean).join(" ")}
      style={style}
    >
      <WorkspaceDayHeader
        weekdayLabel={weekdayLabel}
        dateLabel={dateLabel}
        count={count}
        isToday={isToday}
        todayLabel={todayLabel}
        className={headerClassName}
        contentClassName={headerContentClassName}
        titleClassName={headerTitleClassName}
        dateClassName={headerDateClassName}
        todayClassName={headerTodayClassName}
        countClassName={countClassName}
      />
      <div className={contentClassName}>{children}</div>
      {footer ? <div className={footerClassName}>{footer}</div> : null}
    </article>
  )
}
