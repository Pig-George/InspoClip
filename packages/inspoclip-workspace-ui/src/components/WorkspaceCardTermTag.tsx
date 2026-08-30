import type { HTMLAttributes, MouseEvent, ReactNode, Ref } from "react"

export type WorkspaceCardTermTagProps = Omit<HTMLAttributes<HTMLDivElement>, "children"> & {
  en: ReactNode
  zh?: ReactNode
  showZh?: boolean
  remaining?: number
  containerRef?: Ref<HTMLDivElement>
  onSelectEn?: (event: MouseEvent<HTMLButtonElement>) => void
  onSelectZh?: (event: MouseEvent<HTMLButtonElement>) => void
}

export function WorkspaceCardTermTag({
  en,
  zh,
  showZh = Boolean(zh),
  remaining = 0,
  containerRef,
  onSelectEn,
  onSelectZh,
  className = "",
  ...containerProps
}: WorkspaceCardTermTagProps) {
  const enNode = onSelectEn
    ? <button type="button" className="workspace-card-term-part is-interactive" onClick={onSelectEn}>{en}</button>
    : <span className="workspace-card-term-part">{en}</span>
  const zhNode = onSelectZh
    ? <button type="button" className="workspace-card-term-part is-interactive" onClick={onSelectZh}>{zh}</button>
    : <span className="workspace-card-term-part">{zh}</span>

  return (
    <div {...containerProps} ref={containerRef} className={`workspace-card-primary-tag ${className}`.trim()}>
      {enNode}
      {showZh && zh ? <><span className="workspace-card-term-divider">/</span>{zhNode}</> : null}
      {remaining > 0 ? <small>+{remaining}</small> : null}
    </div>
  )
}
