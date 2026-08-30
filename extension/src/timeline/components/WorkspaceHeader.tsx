import { useState, type ReactNode } from "react"

import { PopupIcon } from "../../popup/components/PopupIcon"
import { WorkspaceHeaderLayout, WorkspaceIconButton, WorkspaceSearchDialog, WorkspaceViewTabs } from "@inspoclip/workspace-ui"
import { weekHeading } from "../presentation"
import type { Locale, TimelineCopy, ViewMode } from "../types"

type WorkspaceHeaderProps = {
  anchor: Date
  canMoveNext: boolean
  dark: boolean
  loading: boolean
  locale: Locale
  search: string
  t: TimelineCopy
  viewMode: ViewMode
  onDarkChange: () => void
  onExport: () => void
  onLocaleChange: () => void
  onMoveWeek: (amount: number) => void
  onRefresh: () => void
  onSearchChange: (value: string) => void
  renderSearchResults?: (close: () => void) => ReactNode
  onViewModeChange: (mode: ViewMode) => void
}

export function WorkspaceHeader(props: WorkspaceHeaderProps) {
  const { anchor, canMoveNext, dark, loading, locale, search, t, viewMode } = props
  const [searchOpen, setSearchOpen] = useState(false)
  const heading = weekHeading(anchor, locale)
  const showWeekNav = viewMode === "week"

  return (
    <div className="workspace-header-anchor">
      <WorkspaceHeaderLayout
        left={<>
          {showWeekNav ? <WorkspaceIconButton className="workspace-icon-button workspace-header-nav-button" label={t.previous} onClick={() => props.onMoveWeek(-1)} icon={<PopupIcon name="chevron-left" />} /> : null}
          <WorkspaceViewTabs
            value={viewMode}
            labels={{ day: t.day, week: t.week, timeline: t.timeline }}
            onChange={props.onViewModeChange}
            renderIcon={(mode) => <PopupIcon name={mode === "day" ? "columns-3" : mode === "week" ? "layout-grid" : "clock"} />}
            className="workspace-view-tabs"
            activeButtonClassName="is-active"
          />
        </>}
        heading={<><h1>{heading.label}</h1><p>{heading.range}</p></>}
        actions={<>
          <button type="button" className="workspace-language-button" title={t.language} aria-label={t.language} onClick={props.onLocaleChange}>{locale === "zh" ? "EN" : "\u4e2d"}</button>
          <WorkspaceIconButton className="workspace-icon-button" label={t.export} onClick={props.onExport} icon={<PopupIcon name="download" />} />
          <WorkspaceIconButton className="workspace-icon-button" label={t.search} onClick={() => setSearchOpen((value) => !value)} icon={<PopupIcon name="search" />} />
          <WorkspaceIconButton className="workspace-icon-button" label={t.refresh} onClick={props.onRefresh} disabled={loading} icon={<PopupIcon name="refresh-cw" />} />
          <WorkspaceIconButton className="workspace-icon-button" label={t.theme} onClick={props.onDarkChange} icon={<PopupIcon name={dark ? "sun" : "moon"} />} />
          {showWeekNav ? <WorkspaceIconButton className="workspace-icon-button workspace-header-nav-button" label={t.next} aria-disabled={!canMoveNext} onClick={() => props.onMoveWeek(1)} icon={<PopupIcon name="chevron-right" />} /> : null}
        </>}
      />
      {searchOpen ? <WorkspaceSearchDialog
        value={search}
        onChange={props.onSearchChange}
        onClose={() => setSearchOpen(false)}
        placeholder={t.search}
        label={t.search}
        closeLabel={t.close}
        inputIcon={<PopupIcon name="search" />}
        closeIcon={<PopupIcon name="x" />}
      >
        {props.renderSearchResults?.(() => setSearchOpen(false))}
      </WorkspaceSearchDialog> : null}
    </div>
  )
}
