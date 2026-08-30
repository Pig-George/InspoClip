import { useState } from "react"

export type WorkspaceTag = { id: string; label: string; color?: string }

export type WorkspaceTagEditorProps = {
  tags: WorkspaceTag[]
  availableTags?: WorkspaceTag[]
  labels: { add: string; remove: string; create?: string; placeholder?: string; empty?: string }
  editable?: boolean
  onAdd?: (tag: WorkspaceTag) => void
  onRemove?: (tag: WorkspaceTag) => void
  onCreate?: (label: string) => void
}

export function WorkspaceTagEditor({ tags, availableTags = [], labels, editable = true, onAdd, onRemove, onCreate }: WorkspaceTagEditorProps) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState("")
  const selectable = availableTags.filter((candidate) => !tags.some((tag) => tag.id === candidate.id))

  const create = () => {
    const label = value.trim()
    if (!label || !onCreate) return
    onCreate(label)
    setValue("")
    setOpen(false)
  }

  return <div className="workspace-tag-editor">
    <div className="workspace-tag-editor-list">
      {tags.map((tag) => <span key={tag.id} className="workspace-tag-editor-chip" style={tag.color ? { backgroundColor: `${tag.color}20`, color: tag.color } : undefined}>
        <span>{tag.label}</span>
        {editable && onRemove ? <button type="button" title={`${labels.remove} ${tag.label}`} aria-label={`${labels.remove} ${tag.label}`} onClick={() => onRemove(tag)}>×</button> : null}
      </span>)}
      {editable && (onAdd || onCreate) ? <button type="button" className="workspace-tag-editor-add" aria-expanded={open} aria-label={labels.add} title={labels.add} onClick={() => setOpen((current) => !current)}>+</button> : null}
    </div>
    {open ? <div className="workspace-tag-editor-picker">
      {onCreate ? <div className="workspace-tag-editor-create"><input value={value} placeholder={labels.placeholder} aria-label={labels.placeholder || labels.create || labels.add} onChange={(event) => setValue(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") create() }} /><button type="button" onClick={create} disabled={!value.trim()}>{labels.create || labels.add}</button></div> : null}
      {selectable.length ? <div className="workspace-tag-editor-options">{selectable.map((tag) => <button type="button" key={tag.id} onClick={() => { onAdd?.(tag); setOpen(false) }}>{tag.label}</button>)}</div> : null}
      {!selectable.length && !onCreate ? <span className="workspace-tag-editor-empty">{labels.empty || "No more tags"}</span> : null}
    </div> : null}
  </div>
}
