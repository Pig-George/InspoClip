import type { CSSProperties, ReactNode } from "react"

export type WorkspaceDayHeaderProps = {
  weekdayLabel?: string
  dateLabel?: string
  count?: number
  isToday?: boolean
  todayLabel?: string
  className?: string
  style?: CSSProperties
  contentClassName?: string
  titleClassName?: string
  dateClassName?: string
  todayClassName?: string
  countClassName?: string
  children?: ReactNode
}

export function WorkspaceDayHeader({
  weekdayLabel,
  dateLabel,
  count,
  isToday = false,
  todayLabel,
  className = "",
  style,
  contentClassName = "",
  titleClassName = "",
  dateClassName = "",
  todayClassName = "",
  countClassName = "",
  children
}: WorkspaceDayHeaderProps) {
  if (children) {
    return <header className={className} style={style}>{children}</header>
  }

  return (
    <header className={className} style={style}>
      <div className={contentClassName}>
        <strong className={titleClassName}>
          {weekdayLabel || ""}
          {isToday && todayLabel ? <span className={todayClassName}>{todayLabel}</span> : null}
        </strong>
        {dateLabel ? <span className={dateClassName}>{dateLabel}</span> : null}
      </div>
      <span className={`${countClassName}${isToday ? " is-today" : ""}`}>{count ?? 0}</span>
    </header>
  )
}
