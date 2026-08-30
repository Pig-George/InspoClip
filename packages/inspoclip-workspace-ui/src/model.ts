export type WorkspaceLocale = "zh" | "en"
export type WorkspaceAssetKind = "image" | "video"

export type WorkspaceMedia = {
  src: string
  mimeType?: string
  durationMs?: number
}

/**
 * Cross-product view model. Product adapters own persistence and resolve media URLs.
 */
export type WorkspaceAsset = {
  id: string
  kind: WorkspaceAssetKind
  createdAt: string
  updatedAt?: string
  title?: string
  titleEn?: string
  titleZh?: string
  filename?: string
  tags?: string[]
  analysis?: unknown
  media?: WorkspaceMedia
}

export type WorkspaceDay<TAsset extends WorkspaceAsset = WorkspaceAsset> = {
  isoDate: string
  date: Date
  assets: TAsset[]
  isToday: boolean
}

export type WorkspaceMonth<TAsset extends WorkspaceAsset = WorkspaceAsset> = {
  month: string
  date: Date
  assets: TAsset[]
}

export function dateKey(value: Date): string {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, "0")
  const day = String(value.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function monthKey(value: Date): string {
  return dateKey(value).slice(0, 7)
}

export function getMonday(value: Date): Date {
  const result = new Date(value)
  result.setHours(0, 0, 0, 0)
  const day = result.getDay()
  result.setDate(result.getDate() - (day === 0 ? 6 : day - 1))
  return result
}

export function workspaceTitle(asset: WorkspaceAsset, locale: WorkspaceLocale, fallback: string): string {
  return (locale === "zh" ? asset.titleZh : asset.titleEn) || asset.title || asset.filename || fallback
}

export function promptText(value: unknown, locale: WorkspaceLocale): string {
  const analysis = asRecord(value)
  const direct = asRecord(analysis?.prompt)
  if (direct) return localizedText(direct, locale)
  const prompts = asRecord(analysis?.replicationPrompts)
  const first = prompts ? Object.values(prompts)[0] : undefined
  if (typeof first === "string") return first
  return localizedText(asRecord(first), locale)
}

export function searchWorkspaceAssets<TAsset extends WorkspaceAsset>(items: TAsset[], query: string): TAsset[] {
  const normalizedQuery = query.trim().toLocaleLowerCase()
  if (!normalizedQuery) return items

  return items.filter((item) => {
    const values: unknown[] = [item.title, item.titleEn, item.titleZh, item.filename, ...(item.tags || [])]
    collectStrings(item.analysis, values)
    return values.some((value) => typeof value === "string" && value.toLocaleLowerCase().includes(normalizedQuery))
  })
}

export function buildIdeaDays<TAsset extends WorkspaceAsset>(items: TAsset[], today = new Date()): WorkspaceDay<TAsset>[] {
  const todayKey = dateKey(today)
  const grouped = new Map<string, TAsset[]>()

  for (const item of items) {
    const key = dateKey(new Date(item.createdAt))
    const values = grouped.get(key) || []
    values.push(item)
    grouped.set(key, values)
  }

  if (!grouped.has(todayKey)) grouped.set(todayKey, [])

  return Array.from(grouped.entries())
    .filter(([isoDate]) => isoDate <= todayKey)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([isoDate, assets]) => ({
      isoDate,
      date: new Date(`${isoDate}T00:00:00`),
      assets: sortWorkspaceAssets(assets),
      isToday: isoDate === todayKey
    }))
}

export function groupAssetsByDate<TAsset extends WorkspaceAsset>(items: TAsset[]): Array<[string, TAsset[]]> {
  const grouped = new Map<string, TAsset[]>()
  for (const item of items) {
    const key = dateKey(new Date(item.createdAt))
    const values = grouped.get(key) || []
    values.push(item)
    grouped.set(key, values)
  }
  return Array.from(grouped.entries())
    .map(([key, values]) => [key, sortWorkspaceAssets(values)] as [string, TAsset[]])
    .sort(([left], [right]) => right.localeCompare(left))
}

export function buildWeekDays<TAsset extends WorkspaceAsset>(items: TAsset[], monday: Date, today = new Date()): WorkspaceDay<TAsset>[] {
  const byDate = new Map(groupAssetsByDate(items))
  const start = getMonday(monday)
  const todayKey = dateKey(today)
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    const isoDate = dateKey(date)
    return { isoDate, date, assets: byDate.get(isoDate) || [], isToday: isoDate === todayKey }
  })
}

export function buildMonthGroups<TAsset extends WorkspaceAsset>(items: TAsset[]): Array<[string, TAsset[]]> {
  const grouped = new Map<string, TAsset[]>()
  for (const item of items) {
    const key = monthKey(new Date(item.createdAt))
    const values = grouped.get(key) || []
    values.push(item)
    grouped.set(key, values)
  }
  return Array.from(grouped.entries())
    .map(([key, values]) => [key, sortWorkspaceAssets(values)] as [string, TAsset[]])
    .sort(([left], [right]) => right.localeCompare(left))
}

export function initialDayIndex<TAsset extends WorkspaceAsset>(days: WorkspaceDay<TAsset>[]): number {
  const todayIndex = days.findIndex((day) => day.isToday)
  return todayIndex >= 0 ? todayIndex : Math.max(0, days.length - 1)
}

export function sortWorkspaceAssets<TAsset extends WorkspaceAsset>(items: TAsset[]): TAsset[] {
  return [...items].sort((left, right) => right.createdAt.localeCompare(left.createdAt) || right.id.localeCompare(left.id))
}

function localizedText(value: Record<string, unknown> | null, locale: WorkspaceLocale): string {
  if (!value) return ""
  const preferred = value[locale]
  if (typeof preferred === "string") return preferred
  return typeof value.en === "string" ? value.en : ""
}

function collectStrings(value: unknown, output: unknown[]): void {
  if (typeof value === "string") {
    output.push(value)
    return
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectStrings(item, output))
    return
  }
  const record = asRecord(value)
  if (record) Object.values(record).forEach((item) => collectStrings(item, output))
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null
}
