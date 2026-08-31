import type { Locale } from "./types"

export function asRecord(value: unknown): Record<string, any> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, any> : null
}

export function localized(value: unknown, locale: Locale): string {
  if (typeof value === "string") return safeDisplayText(value)
  const record = asRecord(value)
  const preferred = typeof record?.[locale] === "string" ? record[locale] as string : typeof record?.en === "string" ? record.en as string : ""
  return safeDisplayText(preferred)
}

export function localizedPrompt(value: unknown): { en: string; zh: string } {
  const record = asRecord(value)
  if (!record) return { en: typeof value === "string" ? safeDisplayText(value) : "", zh: "" }
  const en = safeDisplayText(typeof record.en === "string" ? record.en : typeof record.contentEn === "string" ? record.contentEn : "")
  const zh = safeDisplayText(typeof record.zh === "string" ? record.zh : typeof record.contentZh === "string" ? record.contentZh : "")
  return { en, zh }
}

function safeDisplayText(value: string): string {
  const text = value.trim()
  return /langchain[_.\s-]*core[_.\s-]*messages/i.test(text) ? "" : text
}

export function assetTitle(asset: { title?: string; titleEn?: string; titleZh?: string; filename?: string }, locale: Locale, fallback: string): string {
  return safeDisplayText((locale === "zh" ? asset.titleZh : asset.titleEn) || asset.title || asset.filename || fallback) || fallback
}

export function assetDetailTitle(kind: "image" | "video", locale: Locale): string {
  if (locale === "zh") return kind === "video" ? "视频详情" : "图片详情"
  return kind === "video" ? "Video Detail" : "Image Detail"
}

export function weekNumber(value: Date): number {
  const start = new Date(value.getFullYear(), 0, 1)
  const days = (value.getTime() - start.getTime()) / 86_400_000
  return Math.ceil((days + start.getDay() + 1) / 7)
}

export function weekHeading(monday: Date, locale: Locale): { label: string; range: string } {
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const dateLocale = locale === "zh" ? "zh-CN" : "en-US"
  const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }
  return {
    label: locale === "zh" ? `第 ${weekNumber(monday)} 周` : `Week ${weekNumber(monday)}`,
    range: `${monday.toLocaleDateString(dateLocale, options)} - ${sunday.toLocaleDateString(dateLocale, options)}`
  }
}

export function stageStartSeconds(stage: unknown): number | null {
  const record = asRecord(stage)
  const candidates = [record?.startSeconds, record?.startTime, record?.start, record?.from]
  for (const candidate of candidates) {
    if (typeof candidate === "number" && Number.isFinite(candidate)) return Math.max(0, candidate)
    if (typeof candidate !== "string") continue
    const value = candidate.trim()
    if (/^\d+(?:\.\d+)?$/.test(value)) return Number(value)
    const parts = value.split(":").map(Number)
    if (parts.every(Number.isFinite) && parts.length >= 2 && parts.length <= 3) {
      return parts.reduce((total, part) => total * 60 + part, 0)
    }
  }
  return null
}

export function stageEndSeconds(stage: unknown): number | null {
  const record = asRecord(stage)
  const candidates = [record?.endSeconds, record?.endTime, record?.end, record?.to]
  for (const candidate of candidates) {
    if (typeof candidate === "number" && Number.isFinite(candidate)) return Math.max(0, candidate)
    if (typeof candidate !== "string") continue
    const value = candidate.trim()
    if (/^\d+(?:\.\d+)?$/.test(value)) return Number(value)
    const parts = value.split(":").map(Number)
    if (parts.every(Number.isFinite) && parts.length >= 2 && parts.length <= 3) {
      return parts.reduce((total, part) => total * 60 + part, 0)
    }
  }
  return null
}
