import type { ImgHTMLAttributes, ReactNode, Ref, VideoHTMLAttributes } from "react"

export type WorkspaceMediaPreviewProps = {
  kind: "image" | "video"
  src?: string
  alt: string
  className?: string
  mediaClassName?: string
  fallback?: ReactNode
  overlay?: ReactNode
  imageProps?: Pick<ImgHTMLAttributes<HTMLImageElement>, "loading" | "decoding">
  videoProps?: Pick<VideoHTMLAttributes<HTMLVideoElement>, "autoPlay" | "controls" | "loop" | "muted" | "playsInline" | "preload">
  videoRef?: Ref<HTMLVideoElement>
}

export function WorkspaceMediaPreview({
  kind,
  src,
  alt,
  className = "",
  mediaClassName = "",
  fallback = null,
  overlay = null,
  imageProps,
  videoProps,
  videoRef
}: WorkspaceMediaPreviewProps) {
  return (
    <div className={joinClasses("inspoclip-media-preview", className)}>
      {src ? (
        kind === "image" ? (
          <img src={src} alt={alt} className={mediaClassName} {...imageProps} />
        ) : (
          <video ref={videoRef} src={src} aria-label={alt} className={mediaClassName} {...videoProps} />
        )
      ) : fallback}
      {overlay}
    </div>
  )
}

function joinClasses(...values: string[]): string {
  return values.filter(Boolean).join(" ")
}
