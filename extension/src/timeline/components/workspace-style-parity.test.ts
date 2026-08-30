import React, { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, test } from "vitest"

import { TIMELINE_COPY } from "../copy"
import type { WorkspaceAsset, WorkspaceDay } from "../workspace-model"
import { WorkspaceCard } from "./WorkspaceCard"
import { DetailDialog } from "./DetailDialog"
import { WorkspaceHeader } from "./WorkspaceHeader"
import { WorkspaceNotes } from "./WorkspaceNotes"
import { DayWorkspace } from "./WorkspaceViews"
import { TimelineWorkspace } from "./WorkspaceViews"

const t = TIMELINE_COPY.en
const noop = () => undefined

Object.assign(globalThis, { React })

function asset(kind: "image" | "video"): WorkspaceAsset {
  return {
    id: `${kind}-asset`,
    kind,
    state: "saved",
    mode: "standalone",
    createdAt: "2026-08-09T08:00:00.000Z",
    updatedAt: "2026-08-09T08:00:00.000Z",
    title: `${kind} title`,
    durationMs: kind === "video" ? 9_000 : undefined,
    tags: ["minimal", "motion"],
    content: { dataUrl: `data:${kind === "image" ? "image/png" : "video/webm"};base64,AA==`, mimeType: kind === "image" ? "image/png" : "video/webm" }
  }
}

describe("standalone workspace style parity", () => {
  test("uses the desktop header control classes", () => {
    const html = renderToStaticMarkup(createElement(WorkspaceHeader, {
      anchor: new Date("2026-08-03T00:00:00"),
      canMoveNext: true,
      dark: false,
      loading: false,
      locale: "en",
      search: "",
      t,
      viewMode: "week",
      onDarkChange: noop,
      onExport: noop,
      onLocaleChange: noop,
      onMoveWeek: noop,
      onRefresh: noop,
      onSearchChange: noop,
      onViewModeChange: noop
    }))

    expect(html.match(/workspace-header-nav-button/g)).toHaveLength(2)
  })

  test("uses the same day column structure and navigation icons as the desktop client", () => {
    const day: WorkspaceDay = {
      isoDate: "2026-08-09",
      date: new Date("2026-08-09T00:00:00"),
      isToday: true,
      assets: [asset("image")]
    }
    const html = renderToStaticMarkup(createElement(DayWorkspace, {
      days: [day],
      ideasOnly: true,
      locale: "en",
      notes: "",
      t,
      viewMode: "day",
      onOpen: noop,
      onNotesChange: noop,
      onToggleIdeas: noop
    }))

    expect(html).toContain('class="workspace-day-board"')
    expect(html).toContain('class="workspace-day-column-header"')
    expect(html).toContain('class="workspace-day-column-header-content"')
    expect(html).toContain('class="workspace-day-column-title"')
    expect(html).toContain('class="workspace-day-column-date"')
    expect(html).toContain('class="workspace-day-content client-day-column-content"')
    expect(html).toContain("Today")
    expect(html).toContain('data-popup-icon="chevron-left"')
    expect(html).toContain('data-popup-icon="chevron-right"')
  })

  test("uses the desktop card treatments for images and videos", () => {
    const imageHtml = renderToStaticMarkup(createElement(WorkspaceCard, { asset: asset("image"), locale: "en", t, onOpen: noop }))
    const videoHtml = renderToStaticMarkup(createElement(WorkspaceCard, { asset: asset("video"), locale: "en", t, onOpen: noop }))

    expect(imageHtml).toContain("workspace-asset-card")
    expect(imageHtml).toContain("workspace-card-term-overlay")
    expect(imageHtml).not.toContain("workspace-video-caption")
    expect(videoHtml).toContain("workspace-asset-card")
    expect(videoHtml).toContain("workspace-video-duration")
    expect(videoHtml).toContain("workspace-video-caption")
    expect(imageHtml).toMatch(/workspace-card-decoration-(tape|pin|clip|washi|stitch|staple|sticker|corner)/)
    expect(videoHtml).toMatch(/workspace-card-decoration-(tape|pin|clip|washi|stitch|staple|sticker|corner)/)
  })

  test("uses the client detail overlay contract", () => {
    const html = renderToStaticMarkup(createElement(DetailDialog, {
      asset: asset("image"),
      copyState: false,
      locale: "en",
      t,
      onClose: noop,
      onCopy: noop
    }))

    expect(html).toContain("workspace-dialog-backdrop")
    expect(html).toContain("workspace-dialog")
    expect(html).not.toContain("<span>Image</span>")
  })

  test("uses the desktop sticky-note structure", () => {
    const html = renderToStaticMarkup(createElement(WorkspaceNotes, { content: "Idea", t, onChange: noop }))

    expect(html).toContain("workspace-notes-panel")
    expect(html).toContain("workspace-notes-toggle")
    expect(html).toContain("workspace-sticky-note")
    expect(html).toContain("workspace-sticky-note-tape")
    expect(html).toContain("workspace-sticky-note-textarea")
    expect(html).toContain("workspace-sticky-note-resize")
  })

  test("uses the desktop timeline month navigation", () => {
    const html = renderToStaticMarkup(createElement(TimelineWorkspace, {
      groups: [["2026-08", [asset("image")]]],
      locale: "en",
      t,
      onOpen: noop
    }))

    expect(html).toContain("workspace-timeline-view")
    expect(html).toContain("workspace-timeline-header")
    expect(html).toContain("August 2026")
  })
})
