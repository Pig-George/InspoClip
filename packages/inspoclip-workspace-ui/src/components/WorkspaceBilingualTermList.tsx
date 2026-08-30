import type { ReactNode } from "react"

export type WorkspaceBilingualTerm = {
  id: string
  en: string
  zh?: string
}

export type WorkspaceBilingualTermListProps = {
  terms: WorkspaceBilingualTerm[]
  copiedId?: string | null
  copiedIcon?: ReactNode
  emptyLabel?: string
  onCopy?: (id: string, value: string) => void
  className?: string
}

/** Shared bilingual design-term chips with optional per-language copy callbacks. */
export function WorkspaceBilingualTermList({
  terms,
  copiedId = null,
  copiedIcon,
  emptyLabel,
  onCopy,
  className = ""
}: WorkspaceBilingualTermListProps) {
  return (
    <div className={`workspace-design-terms ${className}`.trim()}>
      {terms.length ? terms.map((term) => {
        const zh = term.zh || term.en
        const same = term.en === zh
        return (
          <div key={term.id} className="workspace-design-term">
            <TermButton id={`${term.id}-en`} value={term.en} copiedId={copiedId} copiedIcon={copiedIcon} onCopy={onCopy} />
            {!same ? <><span className="workspace-design-term-divider">/</span><TermButton id={`${term.id}-zh`} value={zh} copiedId={copiedId} copiedIcon={copiedIcon} onCopy={onCopy} /></> : null}
          </div>
        )
      }) : emptyLabel ? <span className="workspace-design-terms-empty">{emptyLabel}</span> : null}
    </div>
  )
}

function TermButton({ id, value, copiedId, copiedIcon, onCopy }: { id: string, value: string, copiedId: string | null, copiedIcon?: ReactNode, onCopy?: (id: string, value: string) => void }) {
  const copied = copiedId === id
  return (
    <button type="button" className="workspace-design-term-button" onClick={() => onCopy?.(id, value)} disabled={!onCopy}>
      {copied ? <span className="workspace-design-term-check">{copiedIcon}</span> : null}
      {value}
    </button>
  )
}
