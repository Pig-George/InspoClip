import { WorkspaceAssetCard, type WorkspaceCardDecorationType } from "@inspoclip/workspace-ui"

import { assetTitle, asRecord, localized } from "../presentation"
import type { WorkspaceAsset } from "../workspace-model"
import type { Locale, TimelineCopy } from "../types"

type WorkspaceCardProps = {
  asset: WorkspaceAsset
  locale: Locale
  t: TimelineCopy
  onOpen: (asset: WorkspaceAsset) => void
}

export function WorkspaceCard({ asset, locale, t, onOpen }: WorkspaceCardProps) {
  const title = assetTitle(asset, locale, t.unknown)
  const analysis = asRecord(asset.analysis)
  const designTerms = Array.isArray(analysis?.designTerms)
    ? analysis.designTerms
    : Array.isArray(analysis?.terms)
      ? analysis.terms
      : []
  const rawTags = designTerms.length ? designTerms : Array.isArray(asset.tags) ? asset.tags : []
  const tags = rawTags.map((tag) => localized(tag, locale)).filter(Boolean)
  const firstTerm = bilingualTerm(rawTags[0])
  const decorationTypes: WorkspaceCardDecorationType[] = ["tape", "pin", "clip", "washi", "stitch", "staple", "sticker", "corner"]
  const decoration = decorationTypes[asset.id.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) % decorationTypes.length]
  const rotation = asset.id.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) % 5 - 2
  const duration = formatDuration(asset.durationMs)

  return <WorkspaceAssetCard
    kind={asset.kind}
    mediaKind={asset.kind}
    title={title}
    alt={title}
    mediaSrc={asset.content?.dataUrl}
    mediaFallback={<span>{t.previewUnavailable}</span>}
    durationLabel={asset.kind === "video" ? duration : undefined}
    subtitle={asset.kind === "video" ? t.analysisPending : undefined}
    subtitleClassName="workspace-video-caption-status"
    term={firstTerm ? { en: firstTerm.en, zh: firstTerm.zh, showZh: firstTerm.en !== firstTerm.zh, remaining: tags.length - 1 } : undefined}
    decoration={decoration}
    rotation={rotation}
    mediaProps={{ loading: "lazy", preload: "metadata", muted: true }}
    onClick={() => onOpen(asset)}
    ariaLabel={`${t.openDetail}: ${title}`}
  />
}

function bilingualTerm(value: unknown): { en: string; zh: string } | null {
  if (typeof value === "string") {
    const divider = value.indexOf(" / ")
    return divider >= 0 ? { en: value.slice(0, divider), zh: value.slice(divider + 3) } : { en: value, zh: value }
  }
  const record = asRecord(value)
  const en = typeof record?.en === "string" ? record.en : typeof record?.zh === "string" ? record.zh : ""
  const zh = typeof record?.zh === "string" ? record.zh : en
  return en ? { en, zh } : null
}

function formatDuration(durationMs?: number) {
  const seconds = Math.max(0, Math.round((durationMs || 0) / 1000))
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`
}
