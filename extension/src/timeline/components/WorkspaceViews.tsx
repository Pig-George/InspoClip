import { useEffect, useState } from "react"
import { WorkspaceDayBoard, WorkspaceDayColumn, WorkspaceTimelineHeader, WorkspaceTimelineList } from "@inspoclip/workspace-ui"

import type { WorkspaceAsset, WorkspaceDay } from "../workspace-model"
import type { Locale, TimelineCopy } from "../types"
import { PopupIcon } from "../../popup/components/PopupIcon"
import { WorkspaceCard } from "./WorkspaceCard"
import { WorkspaceNotes } from "./WorkspaceNotes"
import { WorkspaceUploader } from "./WorkspaceUploader"

type DayWorkspaceProps = {
  days: WorkspaceDay[]
  ideasOnly: boolean
  locale: Locale
  notes: string
  t: TimelineCopy
  viewMode?: "day" | "week"
  onOpen: (asset: WorkspaceAsset) => void
  onNotesChange?: (value: string) => void
  onToday?: () => void
  onToggleIdeas?: () => void
  onUpload?: (files: File[]) => Promise<void> | void
}

export function DayWorkspace({ days, ideasOnly, locale, notes, t, viewMode = "day", onOpen, onNotesChange, onToday, onToggleIdeas, onUpload }: DayWorkspaceProps) {
  return <WorkspaceDayBoard
    days={days}
    locale={locale}
    ideasOnly={ideasOnly}
    labels={{ today: t.today, previous: t.previous, next: t.next, all: t.all, ideas: t.ideas }}
    onToday={onToday}
    onToggleIdeas={onToggleIdeas}
    previousIcon={<PopupIcon name="chevron-left" />}
    nextIcon={<PopupIcon name="chevron-right" />}
    className={viewMode === "day" ? "workspace-day-board" : "workspace-days"}
    renderColumn={(day) => <DayColumn key={day.isoDate} day={day} t={t} locale={locale} viewMode={viewMode} onOpen={onOpen} onUpload={onUpload} />}
    notes={onNotesChange ? <WorkspaceNotes content={notes} t={t} onChange={onNotesChange} /> : null}
  />
}

function DayColumn({ day, t, locale, viewMode, onOpen, onUpload }: { day: WorkspaceDay; t: TimelineCopy; locale: Locale; viewMode: "day" | "week"; onOpen: (asset: WorkspaceAsset) => void; onUpload?: (files: File[]) => Promise<void> | void }) {
  const dateLocale = locale === "zh" ? "zh-CN" : "en-US"
  return (
    <WorkspaceDayColumn
      isoDate={day.isoDate}
      isToday={day.isToday}
      weekdayLabel={day.date.toLocaleDateString(dateLocale, { weekday: "short" })}
      dateLabel={day.date.toLocaleDateString(dateLocale, { month: "short", day: "numeric" })}
      count={day.assets.length}
      dataDayColumn
      todayLabel={locale === "zh" ? "\u4eca\u5929" : "Today"}
      className={`client-day-column client-day-column-${viewMode}`}
      style={{ maxHeight: viewMode === "day" ? "calc(100vh - 250px)" : "calc(100vh - 280px)" }}
      headerClassName="workspace-day-column-header"
      headerContentClassName="workspace-day-column-header-content"
      headerTitleClassName="workspace-day-column-title"
      headerDateClassName="workspace-day-column-date"
      headerTodayClassName="workspace-day-column-today"
      countClassName="workspace-day-count"
      contentClassName="workspace-day-content client-day-column-content"
      footerClassName="workspace-day-footer"
      footer={day.isToday && onUpload ? <WorkspaceUploader locale={locale} onFiles={onUpload} /> : null}
    >
      {day.assets.length ? day.assets.map((asset) => <WorkspaceCard key={asset.id} asset={asset} t={t} locale={locale} onOpen={onOpen} />) : <span className="workspace-no-content">{t.noContent}</span>}
    </WorkspaceDayColumn>
  )
}

type TimelineWorkspaceProps = {
  groups: Array<[string, WorkspaceAsset[]]>
  locale: Locale
  t: TimelineCopy
  onOpen: (asset: WorkspaceAsset) => void
}

export function TimelineWorkspace({ groups, locale, t, onOpen }: TimelineWorkspaceProps) {
  const dateLocale = locale === "zh" ? "zh-CN" : "en-US"
  const [monthIndex, setMonthIndex] = useState(0)

  useEffect(() => {
    setMonthIndex((current) => Math.min(current, Math.max(0, groups.length - 1)))
  }, [groups.length])

  const selected = groups[monthIndex]
  if (!selected) return null
  const [month, assets] = selected
  const monthLabel = new Date(`${month}-01T00:00:00`).toLocaleDateString(dateLocale, { year: "numeric", month: "long" })

  return <section className="workspace-timeline-view">
    <WorkspaceTimelineHeader
      title={monthLabel}
      meta={`${assets.length} ${t.assets}`}
      previousLabel={t.previous}
      nextLabel={t.next}
      previousIcon={<PopupIcon name="chevron-left" />}
      nextIcon={<PopupIcon name="chevron-right" />}
      canGoPrevious={monthIndex < groups.length - 1}
      canGoNext={monthIndex > 0}
      onPrevious={() => setMonthIndex((current) => Math.min(groups.length - 1, current + 1))}
      onNext={() => setMonthIndex((current) => Math.max(0, current - 1))}
    />
    <WorkspaceTimelineList
      groups={[{ id: month, label: monthLabel, meta: `${assets.length} ${t.assets}`, items: assets }]}
      renderItem={(asset) => <WorkspaceCard key={asset.id} asset={asset} t={t} locale={locale} onOpen={onOpen} />}
    />
  </section>
}
