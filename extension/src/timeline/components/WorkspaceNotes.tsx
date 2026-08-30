import { useRef, useState, type MouseEvent as ReactMouseEvent } from "react"

import { WorkspaceCollapsiblePanel, WorkspaceNotesEditor } from "@inspoclip/workspace-ui"
import { PopupIcon } from "../../popup/components/PopupIcon"
import type { TimelineCopy } from "../types"

type WorkspaceNotesProps = {
  content: string
  t: TimelineCopy
  onChange: (value: string) => void
}

export function WorkspaceNotes({ content, t, onChange }: WorkspaceNotesProps) {
  const [open, setOpen] = useState(true)
  const [height, setHeight] = useState(140)
  const resizing = useRef(false)

  const startResize = (event: ReactMouseEvent<HTMLDivElement>) => {
    event.preventDefault()
    resizing.current = true
    const startY = event.clientY
    const startHeight = height
    const onMove = (moveEvent: MouseEvent) => {
      if (!resizing.current) return
      const next = Math.round((startHeight + moveEvent.clientY - startY) / 28) * 28
      setHeight(Math.max(84, Math.min(420, next)))
    }
    const onEnd = () => {
      resizing.current = false
      document.removeEventListener("mousemove", onMove)
      document.removeEventListener("mouseup", onEnd)
    }
    document.addEventListener("mousemove", onMove)
    document.addEventListener("mouseup", onEnd)
  }

  return <WorkspaceCollapsiblePanel
    open={open}
    onOpenChange={setOpen}
    className={`workspace-notes-panel ${open ? "is-open" : "is-collapsed"}`}
    headingClassName="workspace-notes-toggle"
    labelClassName="workspace-notes-toggle-label"
    icon={<PopupIcon name={open ? "chevron-down" : "chevron-up"} />}
    label={t.notes}
  >
    <WorkspaceNotesEditor label={t.notes} placeholder={t.notesPlaceholder} content={content} onChange={onChange} height={height} onResize={startResize} />
  </WorkspaceCollapsiblePanel>
}
