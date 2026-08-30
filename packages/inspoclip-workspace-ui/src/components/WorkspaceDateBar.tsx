import type { ReactNode, RefObject } from "react"

export type WorkspaceDateBarDay = {
  isoDate: string
  date: Date
  isToday?: boolean
}

export type WorkspaceDateBarProps = {
  days: WorkspaceDateBarDay[]
  activeIndex: number
  labels: {
    today: string
    previous: string
    next: string
  }
  locale?: "zh" | "en"
  onPrevious?: () => void
  onToday?: () => void
  onNext?: () => void
  onSelect: (index: number) => void
  filterLabel?: string
  filterActive?: boolean
  onToggleFilter?: () => void
  previousIcon?: ReactNode
  nextIcon?: ReactNode
  dotsRef?: RefObject<HTMLDivElement>
  className?: string
  controlsClassName?: string
  dotsClassName?: string
}

export function WorkspaceDateBar({
  days,
  activeIndex,
  labels,
  locale = "en",
  onPrevious,
  onToday,
  onNext,
  onSelect,
  filterLabel,
  filterActive = false,
  onToggleFilter,
  previousIcon = "‹",
  nextIcon = "›",
  dotsRef,
  className = "workspace-date-bar",
  controlsClassName = "workspace-date-controls",
  dotsClassName = "workspace-date-dots"
}: WorkspaceDateBarProps) {
  const activeDay = days[activeIndex] || days[days.length - 1]
  const dateLocale = locale === "zh" ? "zh-CN" : "en-US"

  return (
    <div className={className}>
      <div className={controlsClassName}>
        <button type="button" onClick={onPrevious} disabled={!onPrevious || activeIndex <= 0} title={labels.previous} aria-label={labels.previous}>{previousIcon}</button>
        <button type="button" onClick={onToday} disabled={!onToday}>{labels.today}</button>
        <button type="button" onClick={onNext} disabled={!onNext || activeIndex >= days.length - 1} title={labels.next} aria-label={labels.next}>{nextIcon}</button>
        {filterLabel && onToggleFilter ? <button type="button" className={`workspace-filter ${filterActive ? "is-active" : ""}`} onClick={onToggleFilter}>{filterLabel}</button> : null}
      </div>
      <strong>{activeDay?.date.toLocaleDateString(dateLocale, { month: "long", day: "numeric", weekday: "short" })}</strong>
      <div ref={dotsRef} className={dotsClassName}>
        {days.map((day, index) => (
          <button
            key={day.isoDate}
            type="button"
            data-date={day.isoDate}
            className={index === activeIndex ? "is-active" : day.isToday ? "is-today" : ""}
            onClick={() => onSelect(index)}
            aria-label={day.isoDate}
          >
            {day.date.getDate()}
          </button>
        ))}
      </div>
    </div>
  )
}
