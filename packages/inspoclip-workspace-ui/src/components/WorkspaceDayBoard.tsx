import { cloneElement, isValidElement, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject, type UIEvent } from "react"

import { initialDayIndex, type WorkspaceAsset, type WorkspaceDay } from "../model"
import { WorkspaceDateBar } from "./WorkspaceDateBar"
import { WorkspaceDayScroller } from "./WorkspaceDayScroller"

export type WorkspaceDayBoardLabels = {
  today: string
  previous: string
  next: string
  all: string
  ideas: string
}

export type WorkspaceDayBoardProps<TAsset extends WorkspaceAsset> = {
  days: WorkspaceDay<TAsset>[]
  labels: WorkspaceDayBoardLabels
  locale?: "zh" | "en"
  ideasOnly?: boolean
  onToggleIdeas?: () => void
  onToday?: () => void
  renderColumn: (day: WorkspaceDay<TAsset>) => ReactNode
  notes?: ReactNode
  footer?: ReactNode
  previousIcon?: ReactNode
  nextIcon?: ReactNode
  scrollRef?: RefObject<HTMLDivElement>
  onScroll?: (event: UIEvent<HTMLDivElement>) => void
  className?: string
  scrollClassName?: string
  dateBarClassName?: string
  dateControlsClassName?: string
  dateDotsClassName?: string
}

export function WorkspaceDayBoard<TAsset extends WorkspaceAsset>({
  days,
  labels,
  locale = "en",
  ideasOnly = false,
  onToggleIdeas,
  onToday,
  renderColumn,
  notes,
  footer,
  previousIcon,
  nextIcon,
  scrollRef: externalScrollRef,
  onScroll: onScrollExternal,
  className = "workspace-days",
  scrollClassName = "workspace-day-scroll",
  dateBarClassName = "workspace-date-bar",
  dateControlsClassName = "workspace-date-controls",
  dateDotsClassName = "workspace-date-dots"
}: WorkspaceDayBoardProps<TAsset>) {
  const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect
  const internalScrollRef = useRef<HTMLDivElement>(null)
  const scrollRef = externalScrollRef || internalScrollRef
  const positioningRef = useRef(false)
  const [activeIndex, setActiveIndex] = useState(() => initialDayIndex(days))

  useIsomorphicLayoutEffect(() => {
    const nextIndex = initialDayIndex(days)
    setActiveIndex(nextIndex)
    positioningRef.current = true
    const frame = window.requestAnimationFrame(() => {
      const container = scrollRef.current
      if (container) container.scrollLeft = container.scrollWidth - container.clientWidth
      window.requestAnimationFrame(() => { positioningRef.current = false })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [days, scrollRef])

  const scrollToDay = (index: number) => {
    const nextIndex = Math.max(0, Math.min(index, days.length - 1))
    const container = scrollRef.current
    const element = container?.querySelector<HTMLElement>(`[data-date="${days[nextIndex]?.isoDate}"]`)
    if (container && element) container.scrollTo({ left: element.offsetLeft - container.offsetLeft, behavior: "smooth" })
    setActiveIndex(nextIndex)
  }

  return (
    <section className={className}>
      <WorkspaceDateBar
        days={days}
        activeIndex={activeIndex}
        locale={locale}
        labels={{ today: labels.today, previous: labels.previous, next: labels.next }}
        onPrevious={() => scrollToDay(activeIndex - 1)}
        onToday={() => {
          const todayIndex = days.findIndex((day) => day.isToday)
          if (todayIndex >= 0) scrollToDay(todayIndex)
          else onToday?.()
        }}
        onNext={() => scrollToDay(activeIndex + 1)}
        onSelect={scrollToDay}
        previousIcon={previousIcon}
        nextIcon={nextIcon}
        filterLabel={onToggleIdeas ? (ideasOnly ? labels.ideas : labels.all) : undefined}
        filterActive={ideasOnly}
        onToggleFilter={onToggleIdeas}
        className={dateBarClassName}
        controlsClassName={dateControlsClassName}
        dotsClassName={dateDotsClassName}
      />
      <WorkspaceDayScroller scrollRef={scrollRef} className={scrollClassName} onScroll={(event) => {
        onScrollExternal?.(event)
        if (positioningRef.current) return
        const container = event.currentTarget
        const columns = Array.from(container.querySelectorAll<HTMLElement>("[data-date]"))
        if (!columns.length) return
        const target = container.scrollLeft + container.clientWidth / 2
        let closest = 0
        columns.forEach((column, index) => {
          if (Math.abs(column.offsetLeft + column.offsetWidth / 2 - target) < Math.abs(columns[closest].offsetLeft + columns[closest].offsetWidth / 2 - target)) closest = index
        })
        setActiveIndex(closest)
      }}>
        {days.map((day) => {
          const column = renderColumn(day)
          if (isValidElement(column)) return cloneElement(column, { key: day.isoDate, "data-date": day.isoDate })
          return <div key={day.isoDate} data-date={day.isoDate}>{column}</div>
        })}
        {footer}
      </WorkspaceDayScroller>
      {notes}
    </section>
  )
}
