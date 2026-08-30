import { useRef, useState, type ChangeEvent, type ClipboardEvent, type DragEvent, type ReactNode } from "react"

export type WorkspaceUploadProgress = { current: number; total: number }

export type WorkspaceUploadSurfaceProps = {
  label: string
  busyLabel: string
  onFiles: (files: File[]) => Promise<void> | void
  disabled?: boolean
  busy?: boolean
  progress?: WorkspaceUploadProgress
  accept?: string
  multiple?: boolean
  className?: string
  icon?: ReactNode
}

function supportedFiles(files: Iterable<File>): File[] {
  return Array.from(files).filter((file) => file.type.startsWith("image/") || file.type.startsWith("video/"))
}

function clipboardFiles(event: ClipboardEvent<HTMLElement>): File[] {
  const clipboard = event.clipboardData
  const files = clipboard?.files ? Array.from(clipboard.files) : []
  if (files.length) return supportedFiles(files)
  return Array.from(clipboard?.items || [])
    .filter((item) => item.type.startsWith("image/") || item.type.startsWith("video/"))
    .map((item) => item.getAsFile())
    .filter((file): file is File => Boolean(file))
}

/** Shared drag, paste and file-picker surface. Apps own upload side effects. */
export function WorkspaceUploadSurface({
  label,
  busyLabel,
  onFiles,
  disabled = false,
  busy = false,
  progress,
  accept = "image/*,video/*",
  multiple = true,
  className = "",
  icon
}: WorkspaceUploadSurfaceProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const isBusy = busy || submitting

  const submit = async (files: Iterable<File>) => {
    const supported = supportedFiles(files)
    if (!supported.length || disabled || isBusy) return
    setSubmitting(true)
    try {
      await onFiles(supported)
    } finally {
      setSubmitting(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  const onDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault()
    setDragging(false)
    void submit(event.dataTransfer.files)
  }

  const onPaste = (event: ClipboardEvent<HTMLElement>) => {
    const files = clipboardFiles(event)
    if (!files.length) return
    event.preventDefault()
    event.stopPropagation()
    void submit(files)
  }

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    void submit(event.target.files || [])
  }

  const progressPercent = progress && progress.total > 0
    ? Math.min(100, Math.max(0, progress.current / progress.total * 100))
    : 0

  return (
    <section
      className={["workspace-uploader", dragging ? "is-dragging" : "", isBusy ? "is-uploading" : "", className].filter(Boolean).join(" ")}
      onDragOver={(event) => { event.preventDefault(); if (!disabled && !isBusy) setDragging(true) }}
      onDragLeave={(event) => { if (event.currentTarget === event.target) setDragging(false) }}
      onDrop={onDrop}
      onPaste={onPaste}
      tabIndex={0}
    >
      <input ref={inputRef} className="workspace-uploader-input" type="file" accept={accept} multiple={multiple} onChange={onChange} />
      <button type="button" className="workspace-uploader-button" disabled={disabled || isBusy} onClick={() => inputRef.current?.click()}>
        {isBusy ? (
          progress && progress.total > 1 ? (
            <>
              <span className="workspace-uploader-progress" role="progressbar" aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.current}>
                <span className="workspace-uploader-progress-bar" style={{ width: `${progressPercent}%` }} />
              </span>
              <span className="workspace-uploader-label">{busyLabel} {progress.current}/{progress.total}</span>
            </>
          ) : (
            <>
              <span className="workspace-uploader-spinner" aria-hidden="true" />
              <span className="workspace-uploader-label">{busyLabel}</span>
            </>
          )
        ) : (
          <>
            {icon || <span className="workspace-uploader-icon" aria-hidden="true">+</span>}
            <span className="workspace-uploader-label">{label}</span>
          </>
        )}
      </button>
    </section>
  )
}
