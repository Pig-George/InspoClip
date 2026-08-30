import { cloneElement, isValidElement, type ReactNode } from "react"

export type WorkspacePromptLanguage = "auto" | "en" | "zh" | "both"

export type WorkspacePromptToolbarProps = {
  language: WorkspacePromptLanguage
  onLanguageChange: (language: WorkspacePromptLanguage) => void
  onCopy?: () => void
  onRegenerate?: () => void
  copyState?: boolean
  generating?: boolean
  disabled?: boolean
  labels: {
    auto: string
    en: string
    zh: string
    both: string
    copy: string
    copied?: string
    regenerate: string
  }
  icons: {
    copy: ReactNode
    copied?: ReactNode
    regenerate: ReactNode
  }
  className?: string
}

export function WorkspacePromptToolbar({
  language,
  onLanguageChange,
  onCopy,
  onRegenerate,
  copyState = false,
  generating = false,
  disabled = false,
  labels,
  icons,
  className = ""
}: WorkspacePromptToolbarProps) {
  const options: Array<[WorkspacePromptLanguage, string]> = [
    ["auto", labels.auto],
    ["en", labels.en],
    ["zh", labels.zh],
    ["both", labels.both]
  ]

  return <div className={`workspace-prompt-toolbar ${className}`.trim()}>
    <div className="workspace-prompt-languages" role="group" aria-label="Prompt language">
      {options.map(([value, label]) => <button key={value} type="button" className={language === value ? "is-active" : ""} onClick={() => onLanguageChange(value)}>{label}</button>)}
    </div>
    <div className="workspace-prompt-actions">
      {onCopy ? <button type="button" className="workspace-prompt-action-button" title={copyState ? labels.copied || labels.copy : labels.copy} aria-label={copyState ? labels.copied || labels.copy : labels.copy} onClick={onCopy} disabled={disabled}><span className={copyState ? "workspace-prompt-action-success" : ""}>{withClass(copyState ? icons.copied || icons.copy : icons.copy, copyState ? "workspace-prompt-action-success" : "")}</span></button> : null}
      {onRegenerate ? <button type="button" className="workspace-prompt-action-button" title={labels.regenerate} aria-label={labels.regenerate} onClick={onRegenerate} disabled={disabled || generating}><span className={generating ? "is-spinning" : ""}>{withClass(icons.regenerate, generating ? "workspace-prompt-action-spinner is-spinning" : "")}</span></button> : null}
    </div>
  </div>
}

function withClass(value: ReactNode, className: string): ReactNode {
  if (!className || !isValidElement(value)) return value
  const current = typeof value.props.className === "string" ? value.props.className : ""
  return cloneElement(value, { className: `${current} ${className}`.trim() })
}
