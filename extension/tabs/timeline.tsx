import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import "@inspoclip/workspace-ui/fonts"

import { DetailDialog } from "../src/timeline/components/DetailDialog"
import { WorkspaceHeader } from "../src/timeline/components/WorkspaceHeader"
import { WorkspaceCard } from "../src/timeline/components/WorkspaceCard"
import { WorkspaceViewContent } from "../src/timeline/components/WorkspaceViewContent"
import { WorkspaceAnalysisStatus } from "../src/timeline/components/WorkspaceAnalysisStatus"
import { DayWorkspace, TimelineWorkspace } from "../src/timeline/components/WorkspaceViews"
import { TIMELINE_COPY } from "../src/timeline/copy"
import { loadAllSavedAssets } from "../src/timeline/workspace-data"
import { buildIdeaDays, buildMonthGroups, buildWeekDays, dateKey, getMonday, parseStoredValue, promptText, searchWorkspaceAssets, type WorkspaceAsset } from "../src/timeline/workspace-model"
import type { Locale, ViewMode } from "../src/timeline/types"
import { blobToDataUrl, sendRuntimeCommand } from "../src/runtime/command-client"
import type { AnalysisJob, Asset, Page, PromptResult } from "../src/runtime/contracts"
import { isDevelopmentBuild } from "../src/runtime/build-mode"
import { createExtensionLogRecorder, installExtensionErrorLogging, type ExtensionLogStorage } from "../src/runtime/extension-logger"
import { clipboardAssetFiles } from "../src/timeline/clipboard"
import { normalizeImageAnalysis } from "../src/timeline/image-analysis"
import "../src/timeline/style.css"
import "@inspoclip/workspace-ui/styles/workspace-timeline.css"
import "@inspoclip/workspace-ui/styles/workspace-tokens.css"

installExtensionErrorLogging({
  source: "timeline",
  enabled: isDevelopmentBuild,
  storage: chrome.storage.local as unknown as ExtensionLogStorage
})

const recordTimelineLog = createExtensionLogRecorder(chrome.storage.local as unknown as ExtensionLogStorage, isDevelopmentBuild)

export default function TimelinePage() {
  const [items, setItems] = useState<WorkspaceAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [viewMode, setViewMode] = useState<ViewMode>(() => readStorage<ViewMode>("inspoclip.timeline.view", "day"))
  const [locale, setLocale] = useState<Locale>(() => readStorage<Locale>("inspoclip.locale", "zh"))
  const [dark, setDark] = useState(() => readStorage<string>("inspoclip.timeline.theme", "light") === "dark")
  const [search, setSearch] = useState("")
  const [ideasOnly, setIdeasOnly] = useState(true)
  const [anchor, setAnchor] = useState(() => getMonday(new Date()))
  const [notes, setNotes] = useState(() => readStorage<string>(`inspoclip.timeline.notes.${dateKey(getMonday(new Date()))}`, ""))
  const [detail, setDetail] = useState<WorkspaceAsset | null>(null)
  const [copyState, setCopyState] = useState(false)
  const [promptGeneratingIds, setPromptGeneratingIds] = useState<Set<string>>(() => new Set())
  const [target, setTarget] = useState("")
  const [analysisStatus, setAnalysisStatus] = useState({ active: 0, completed: 0, total: 0 })
  const pendingUploads = useRef(new Map<string, { dataUrl: string; filename: string; mimeType: string; durationMs?: number }>())
  const t = TIMELINE_COPY[locale]

  const loadAssets = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const assets = await loadAllSavedAssets((cursor) => sendRuntimeCommand<Page<Asset>>({
        type: "runtime.asset.list",
        payload: { state: "saved", limit: 200, ...(cursor ? { cursor } : {}) }
      }))
      const loaded = await Promise.all(assets.map(async (asset) => {
        if (!asset.blob) return asset as WorkspaceAsset
        try {
          const content = await sendRuntimeCommand<{ dataUrl: string; mimeType: string }>({ type: "runtime.asset.content.read", payload: { assetId: asset.id } })
          return { ...asset, content } as WorkspaceAsset
        } catch (cause) {
          void recordTimelineLog({ source: "timeline", level: "warn", error: cause, context: { event: "asset-content-read", assetId: asset.id } })
          return asset as WorkspaceAsset
        }
      }))
      setItems(loaded)
      if (loaded.length > 0) {
        const newest = [...loaded].sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0]
        setAnchor(getMonday(new Date(newest.createdAt)))
      }
    } catch (cause) {
      void recordTimelineLog({ source: "timeline", level: "error", error: cause, context: { event: "asset-list" } })
      setError(cause instanceof Error ? cause.message : "Failed to load local timeline")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void loadAssets() }, [loadAssets])
  useEffect(() => {
    document.title = "InspoClip"
    document.documentElement.classList.toggle("timeline-dark", dark)
    window.localStorage.setItem("inspoclip.timeline.theme", dark ? "dark" : "light")
  }, [dark])
  useEffect(() => { window.localStorage.setItem("inspoclip.timeline.view", viewMode) }, [viewMode])
  useEffect(() => { window.localStorage.setItem("inspoclip.locale", locale) }, [locale])
  useEffect(() => {
    const key = `inspoclip.timeline.notes.${dateKey(anchor)}`
    setNotes(readStorage<string>(key, ""))
  }, [anchor])

  const updateNotes = (value: string) => {
    setNotes(value)
    window.localStorage.setItem(`inspoclip.timeline.notes.${dateKey(anchor)}`, value)
  }

  const visibleItems = useMemo(() => searchWorkspaceAssets(items, search), [items, search])
  const weekDays = useMemo(() => buildWeekDays(visibleItems, anchor), [visibleItems, anchor])
  const ideaDays = useMemo(() => buildIdeaDays(visibleItems), [visibleItems])
  const monthGroups = useMemo(() => buildMonthGroups(visibleItems), [visibleItems])
  const canMoveNext = dateKey(anchor) < dateKey(getMonday(new Date()))

  const moveWeek = useCallback((amount: number) => {
    if (amount === 0) {
      setAnchor(getMonday(new Date()))
      return
    }
    if (amount > 0 && !canMoveNext) return
    setAnchor((current) => {
      const next = new Date(current)
      next.setDate(next.getDate() + amount * 7)
      return next
    })
  }, [canMoveNext])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable || detail) return
      const key = event.key.toLocaleLowerCase()
      if (key === "d") setViewMode("day")
      if (key === "w") setViewMode("week")
      if (key === "t") setViewMode("timeline")
      if (viewMode === "week" && event.key === "ArrowLeft") moveWeek(-1)
      if (viewMode === "week" && event.key === "ArrowRight") moveWeek(1)
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [detail, moveWeek, viewMode])

  const exportAssets = () => {
    const payload = visibleItems.map(({ content: _content, blob: _blob, ...asset }) => asset)
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }))
    const link = document.createElement("a")
    link.href = url
    link.download = `inspoclip-${dateKey(new Date())}.json`
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
  }

  const copyPrompt = async (value?: string) => {
    const prompt = value || promptText(detail?.analysis, locale)
    if (!prompt) return
    await navigator.clipboard?.writeText(prompt)
    setCopyState(true)
    window.setTimeout(() => setCopyState(false), 1400)
  }

  const replaceAsset = useCallback((next: WorkspaceAsset) => {
    setItems((current) => current.map((item) => item.id === next.id ? { ...item, ...next } : item))
    setDetail((current) => current?.id === next.id ? { ...current, ...next } : current)
  }, [])

  const regeneratePrompt = useCallback(async (requestedPurpose?: string, requestedTarget?: string, force = true) => {
    if (!detail) return
    const asset = detail
    const purpose = asset.kind === "image" ? "image-design" : requestedPurpose || "general"
    const target = purpose === "general" || purpose === "json" ? "" : requestedTarget || ""
    setPromptGeneratingIds((current) => new Set(current).add(asset.id))
    try {
      const generated = await sendRuntimeCommand<PromptResult>({
        type: "runtime.prompt.generate",
        payload: { assetId: asset.id, purpose, ...(target ? { target } : {}), language: "both", regenerate: force }
      })
      const previous = asset.analysis && typeof asset.analysis === "object" ? asset.analysis as Record<string, unknown> : {}
      const analysis = asset.kind === "image"
        ? { ...previous, prompt: generated.content }
        : { ...previous, replicationPrompts: { ...(previous.replicationPrompts && typeof previous.replicationPrompts === "object" ? previous.replicationPrompts as Record<string, unknown> : {}), [purpose]: generated.content } }
      const next = { ...asset, analysis }
      try {
        await sendRuntimeCommand<Asset>({ type: "runtime.asset.update", payload: { assetId: asset.id, patch: { analysis } } })
      } catch (cause) {
        void recordTimelineLog({ source: "timeline", level: "warn", error: cause, context: { event: "prompt-persist", assetId: asset.id } })
      }
      replaceAsset(next)
    } catch (cause) {
      void recordTimelineLog({ source: "timeline", level: "error", error: cause, context: { event: "prompt-regenerate", assetId: asset.id } })
      setError(cause instanceof Error ? cause.message : t.generateOutput)
    } finally {
      setPromptGeneratingIds((current) => {
        const next = new Set(current)
        next.delete(asset.id)
        return next
      })
    }
  }, [detail, replaceAsset, t.noPrompt])

  const updateDetailTags = useCallback(async (tags: string[]) => {
    if (!detail) return
    const next = { ...detail, tags }
    try {
      await sendRuntimeCommand<Asset>({ type: "runtime.asset.update", payload: { assetId: detail.id, patch: { tags } } })
      replaceAsset(next)
    } catch (cause) {
      void recordTimelineLog({ source: "timeline", level: "warn", error: cause, context: { event: "tags-update", assetId: detail.id } })
    }
  }, [detail, replaceAsset])

  const deleteDetail = useCallback(async () => {
    if (!detail) return
    const asset = detail
    try {
      await sendRuntimeCommand({ type: "runtime.asset.delete", payload: { assetId: asset.id, kind: asset.kind } })
      pendingUploads.current.delete(asset.id)
      setItems((current) => current.filter((item) => item.id !== asset.id))
      setDetail(null)
    } catch (cause) {
      void recordTimelineLog({ source: "timeline", level: "error", error: cause, context: { event: "asset-delete", assetId: asset.id } })
      setError(cause instanceof Error ? cause.message : (locale === "zh" ? "删除失败，请重试" : "Delete failed, please try again"))
      throw cause
    }
  }, [detail, locale])

  const persistUploadedAsset = useCallback(async (asset: WorkspaceAsset, upload: { dataUrl: string; filename: string; mimeType: string; durationMs?: number }, analysis?: unknown) => {
    if (asset.mode === "backend" && asset.kind === "image") {
      const today = new Date()
      const monday = getMonday(today)
      await sendRuntimeCommand({
        type: "runtime.asset.image.save",
        payload: {
          ...upload,
          weekStart: dateKey(monday),
          dayOfWeek: (today.getDay() + 6) % 7,
          ...(analysis !== undefined ? { analysis } : {})
        }
      })
    } else if (asset.mode === "backend" && asset.kind === "video") {
      await sendRuntimeCommand({ type: "runtime.asset.video.save", payload: { assetId: asset.id } })
    } else {
      const saved = await sendRuntimeCommand<Asset>({ type: "runtime.asset.save", payload: { assetId: asset.id } })
      asset = { ...asset, ...saved }
    }
    const savedAsset: WorkspaceAsset = {
      ...asset,
      state: "saved",
      ...(analysis !== undefined ? { analysis } : {}),
      updatedAt: new Date().toISOString()
    }
    pendingUploads.current.delete(asset.id)
    setItems((current) => [savedAsset, ...current.filter((item) => item.id !== savedAsset.id)])
    setDetail(savedAsset)
  }, [])

  const addUploadedFiles = useCallback(async (files: File[]) => {
    if (!files.length) return
    setAnalysisStatus((current) => current.active > 0
      ? { ...current, active: current.active + files.length, total: current.total + files.length }
      : { active: files.length, completed: 0, total: files.length })
    for (const file of files) {
      try {
        const kind = file.type.startsWith("video/") ? "video" : "image"
        const dataUrl = await blobToDataUrl(file)
        const durationMs = kind === "video" ? await getVideoDurationMs(file) : undefined
        const draft = await sendRuntimeCommand<Asset>({ type: "runtime.asset.createDraft", payload: { kind, dataUrl, filename: file.name || `upload.${kind === "image" ? "png" : "mp4"}`, mimeType: file.type || (kind === "image" ? "image/png" : "video/mp4"), source: "workspace" } })
        const withContent: WorkspaceAsset = { ...draft, content: { dataUrl, mimeType: file.type }, ...(durationMs ? { durationMs } : {}) }
        const upload = { dataUrl, filename: file.name, mimeType: file.type, ...(durationMs ? { durationMs } : {}) }
        pendingUploads.current.set(draft.id, upload)
        if (kind === "image") {
          const job = await sendRuntimeCommand<AnalysisJob>({ type: "runtime.analysis.image.start", payload: { assetId: draft.id, dataUrl, filename: file.name, mimeType: file.type } })
          const analysis = normalizeImageAnalysis(job.result)
          try { await sendRuntimeCommand<Asset>({ type: "runtime.asset.update", payload: { assetId: draft.id, patch: { analysis } } }) } catch { /* analysis adapter already persists standalone results */ }
          await persistUploadedAsset({ ...withContent, analysis }, upload, analysis)
        } else {
          const job = await sendRuntimeCommand<AnalysisJob>({ type: "runtime.analysis.video.start", payload: { assetId: draft.id, dataUrl, filename: file.name, mimeType: file.type, draft: true, ...(durationMs ? { durationMs } : {}) } })
          if (job.assetId !== draft.id) pendingUploads.current.set(job.assetId, upload)
          await waitForVideoAnalysis(job, async (completed) => {
            const stored = await sendRuntimeCommand<Asset | null>({ type: "runtime.asset.get", payload: { assetId: completed.assetId } }).catch(() => null)
            const completedUpload = pendingUploads.current.get(completed.assetId) || pendingUploads.current.get(draft.id) || upload
            const completedAsset: WorkspaceAsset = { ...(stored || withContent), id: completed.assetId || draft.id, durationMs: stored?.durationMs || durationMs, analysis: stored?.analysis || completed.result, content: { dataUrl: completedUpload.dataUrl, mimeType: completedUpload.mimeType } }
            await persistUploadedAsset(completedAsset, completedUpload, completedAsset.analysis)
          })
        }
      } catch (cause) {
        void recordTimelineLog({ source: "timeline", level: "error", error: cause, context: { event: "workspace-upload-analysis", filename: file.name } })
        setError(cause instanceof Error ? cause.message : t.analysisFailed)
      } finally {
        setAnalysisStatus((current) => ({ ...current, active: Math.max(0, current.active - 1), completed: Math.min(current.total, current.completed + 1) }))
      }
    }
  }, [persistUploadedAsset, t.analysisFailed])

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      if (event.defaultPrevented) return
      const target = event.target as HTMLElement | null
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable) return
      const files = clipboardAssetFiles(event)
      if (!files.length) return
      event.preventDefault()
      void addUploadedFiles(files)
    }
    document.addEventListener("paste", onPaste)
    return () => document.removeEventListener("paste", onPaste)
  }, [addUploadedFiles])

  return (
    <main className="workspace-root inspoclip-workspace">
      <WorkspaceHeader
        anchor={anchor}
        canMoveNext={canMoveNext}
        dark={dark}
        loading={loading}
        locale={locale}
        search={search}
        t={t}
        viewMode={viewMode}
        onDarkChange={() => setDark((value) => !value)}
        onExport={exportAssets}
        onLocaleChange={() => setLocale((value) => value === "zh" ? "en" : "zh")}
        onMoveWeek={moveWeek}
        onRefresh={() => void loadAssets()}
        onSearchChange={setSearch}
        onViewModeChange={setViewMode}
        renderSearchResults={(close) => search.trim() ? (
          visibleItems.length ? <div className="workspace-search-result-grid">{visibleItems.map((asset) => <WorkspaceCard key={asset.id} asset={asset} t={t} locale={locale} onOpen={(selected) => { close(); setDetail(selected) }} />)}</div> : <p className="workspace-search-state">{t.empty}</p>
        ) : null}
      />

      {error ? <div className="workspace-state workspace-error">{error}</div> : null}
      {loading && items.length === 0 ? <div className="workspace-state">{t.loading}</div> : null}
      {!loading && !error && visibleItems.length === 0 ? <div className="workspace-state workspace-empty"><strong>{t.empty}</strong><span>{t.emptyHint}</span></div> : null}

      <WorkspaceViewContent
        hasContent={visibleItems.length > 0}
        viewMode={viewMode}
        day={<DayWorkspace viewMode="day" days={ideasOnly ? ideaDays : weekDays} notes={notes} t={t} locale={locale} ideasOnly={ideasOnly} onToggleIdeas={() => setIdeasOnly((value) => !value)} onNotesChange={updateNotes} onOpen={setDetail} onUpload={addUploadedFiles} />}
        week={<DayWorkspace viewMode="week" days={weekDays} notes={notes} t={t} locale={locale} ideasOnly={false} onNotesChange={updateNotes} onOpen={setDetail} onToday={() => setAnchor(getMonday(new Date()))} onUpload={addUploadedFiles} />}
        timeline={<TimelineWorkspace groups={monthGroups} t={t} locale={locale} onOpen={setDetail} />}
      />

      <WorkspaceAnalysisStatus label={t.uploading} completed={analysisStatus.completed} total={analysisStatus.active > 0 ? analysisStatus.total : 0} />

      {detail ? <DetailDialog asset={detail} t={t} locale={locale} copyState={copyState} promptGenerating={promptGeneratingIds.has(detail.id)} onCopy={(text) => void copyPrompt(text)} onGenerate={(purpose, force) => void regeneratePrompt(purpose, target, force !== false)} onPurposeChange={() => undefined} onTargetChange={setTarget} onTagsChange={(tags) => void updateDetailTags(tags)} onDelete={deleteDetail} onClose={() => setDetail(null)} /> : null}
    </main>
  )
}

async function getVideoDurationMs(file: File): Promise<number | undefined> {
  const url = URL.createObjectURL(file)
  try {
    const duration = await new Promise<number>((resolve) => {
      const video = document.createElement("video")
      video.preload = "metadata"
      video.onloadedmetadata = () => resolve(Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0)
      video.onerror = () => resolve(0)
      video.src = url
    })
    return duration > 0 ? Math.round(duration * 1000) : undefined
  } finally {
    URL.revokeObjectURL(url)
  }
}

async function waitForVideoAnalysis(job: AnalysisJob, onCompleted: (job: AnalysisJob) => Promise<void>): Promise<void> {
  for (let index = 0; index < 240; index += 1) {
    await new Promise((resolve) => window.setTimeout(resolve, 1500))
    const current = await sendRuntimeCommand<AnalysisJob | null>({ type: "runtime.analysis.job.get", payload: { jobId: job.id } })
    if (!current || current.status === "failed" || current.status === "cancelled") return
    if (current.status === "completed") {
      await onCompleted(current)
      return
    }
  }
}

function readStorage<T>(key: string, fallback: T): T {
  try {
    return parseStoredValue(window.localStorage.getItem(key), fallback)
  } catch {
    return fallback
  }
}
