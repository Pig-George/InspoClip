import { useCallback, useRef, type MouseEvent, type Ref } from "react"

export type WorkspaceNotesEditorProps = {
  label: string
  placeholder: string
  content: string
  onChange: (value: string) => void
  onBlur?: () => void
  height: number
  onResize?: (event: MouseEvent<HTMLDivElement>) => void
  resizeRef?: Ref<HTMLDivElement>
}

/** Shared sticky-note editor used by both timeline implementations. */
export function WorkspaceNotesEditor({ label, placeholder, content, onChange, onBlur, height, onResize, resizeRef }: WorkspaceNotesEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const handleScroll = useCallback(() => {
    if (!textareaRef.current) return
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current)
    scrollTimerRef.current = setTimeout(() => {
      if (textareaRef.current) textareaRef.current.scrollTop = Math.round(textareaRef.current.scrollTop / 28) * 28
    }, 100)
  }, [])

  return (
    <div className="workspace-sticky-note" data-workspace-notes-editor>
      <div className="workspace-sticky-note-tape" aria-hidden="true" />
      <div className="workspace-sticky-note-header"><span>{label}</span><small>—</small></div>
      <div className="workspace-sticky-note-editor" style={{ height }}>
        <textarea
          ref={textareaRef}
          className="workspace-sticky-note-textarea"
          value={content}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          onScroll={handleScroll}
          placeholder={placeholder}
          aria-label={label}
        />
      </div>
      <div ref={resizeRef} className="workspace-sticky-note-resize" onMouseDown={onResize} aria-hidden="true"><i /></div>
    </div>
  )
}
