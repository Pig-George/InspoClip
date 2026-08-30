import type { CSSProperties, MouseEvent, ReactNode } from "react"

import { WorkspaceCardCaption } from "./WorkspaceCardCaption"
import { WorkspaceCardDecoration, type WorkspaceCardDecorationType } from "./WorkspaceCardDecoration"
import { WorkspaceCardTermTag } from "./WorkspaceCardTermTag"
import { WorkspaceMediaPreview } from "./WorkspaceMediaPreview"

export type WorkspaceAssetCardTerm = {
  en: string
  zh?: string
  showZh?: boolean
  remaining?: number
}

export type WorkspaceAssetCardProps = {
  kind: "image" | "video"
  title: string
  alt?: string
  mediaSrc?: string
  mediaKind?: "image" | "video"
  mediaFallback?: ReactNode
  durationLabel?: string
  subtitle?: ReactNode
  subtitleClassName?: string
  term?: WorkspaceAssetCardTerm
  termContent?: ReactNode
  decoration?: WorkspaceCardDecorationType
  rotation?: number
  animationDelay?: number
  children?: ReactNode
  onClick: () => void
  onContextMenu?: (event: MouseEvent<HTMLElement>) => void
  className?: string
  mediaClassName?: string
  mediaProps?: {
    loading?: "eager" | "lazy"
    muted?: boolean
    preload?: "none" | "metadata" | "auto"
  }
  ariaLabel?: string
  element?: "button" | "div"
}

/** Shared visual card used by the desktop client and standalone extension. */
export function WorkspaceAssetCard({
  kind,
  title,
  alt = title,
  mediaSrc,
  mediaKind = "image",
  mediaFallback,
  durationLabel,
  subtitle,
  subtitleClassName,
  term,
  termContent,
  decoration,
  rotation = 0,
  animationDelay = 0,
  children,
  onClick,
  onContextMenu,
  className = "",
  mediaClassName = "",
  mediaProps,
  ariaLabel = title,
  element = "button"
}: WorkspaceAssetCardProps) {
  const style = {
    "--workspace-card-rotation": `${rotation}deg`,
    animationDelay: `${animationDelay}ms`
  } as CSSProperties

  const content = (
    <>
      {decoration ? <WorkspaceCardDecoration type={decoration} /> : null}
      <WorkspaceMediaPreview
        kind={mediaKind}
        src={mediaSrc}
        alt={alt}
        className="workspace-card-media"
        mediaClassName={mediaClassName || "workspace-card-media-content"}
        fallback={mediaFallback}
        imageProps={{ loading: mediaProps?.loading || "lazy" }}
        videoProps={{ muted: mediaProps?.muted, preload: mediaProps?.preload || "metadata" }}
        overlay={kind === "video" && durationLabel ? <span className="workspace-video-duration">{durationLabel}</span> : null}
      />
      {kind === "image" && termContent ? termContent : kind === "image" && term ? (
        <div className="workspace-card-term-overlay">
          <WorkspaceCardTermTag en={term.en} zh={term.zh || term.en} showZh={term.showZh ?? Boolean(term.zh && term.zh !== term.en)} remaining={term.remaining || 0} />
        </div>
      ) : null}
      {kind === "video" ? (
        <WorkspaceCardCaption title={title} subtitle={subtitle} subtitleClassName={subtitleClassName} className="workspace-video-caption" />
      ) : null}
      {children}
    </>
  )

  if (element === "div") {
    return <div data-workspace-card className={`polaroid workspace-polaroid workspace-asset-card ${className}`.trim()} style={style} onClick={onClick} onContextMenu={onContextMenu} role="button" tabIndex={0} aria-label={ariaLabel}>{content}</div>
  }

  return <button type="button" data-workspace-card className={`polaroid workspace-polaroid workspace-asset-card ${className}`.trim()} style={style} onClick={onClick} onContextMenu={onContextMenu} aria-label={ariaLabel}>{content}</button>
}
