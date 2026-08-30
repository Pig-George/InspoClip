import type { ReactNode, Ref } from "react"

import { WorkspaceSearchInput } from "./WorkspaceSearchInput"

export type WorkspaceSearchDialogProps = {
  value: string
  placeholder: string
  label: string
  closeLabel: string
  inputIcon?: ReactNode
  closeIcon?: ReactNode
  filters?: ReactNode
  children: ReactNode
  inputRef?: Ref<HTMLInputElement>
  backdropRef?: Ref<HTMLDivElement>
  autoFocus?: boolean
  onChange: (value: string) => void
  onClose: () => void
}

export function WorkspaceSearchDialog({
  value,
  placeholder,
  label,
  closeLabel,
  inputIcon,
  closeIcon,
  filters,
  children,
  inputRef,
  backdropRef,
  autoFocus = true,
  onChange,
  onClose
}: WorkspaceSearchDialogProps) {
  return (
    <div ref={backdropRef} className="workspace-search-dialog-backdrop" data-dialog-overlay onClick={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div className="workspace-search-dialog" role="dialog" aria-modal="true" aria-label={label}>
        <header className="workspace-search-dialog-header">
          <WorkspaceSearchInput
            inputRef={inputRef}
            autoFocus={autoFocus}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            label={label}
            icon={inputIcon}
            className="workspace-search-field"
            inputClassName="workspace-search-input"
          />
          <button type="button" className="workspace-search-close" onClick={onClose} title={closeLabel} aria-label={closeLabel}>{closeIcon || closeLabel}</button>
        </header>
        {filters ? <div className="workspace-search-filters">{filters}</div> : null}
        <div className="workspace-search-results">{children}</div>
      </div>
    </div>
  )
}
