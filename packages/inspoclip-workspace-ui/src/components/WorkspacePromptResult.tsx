import type { ReactNode } from "react"

export type WorkspacePromptResultProps = {
  hasPrompt: boolean
  generating?: boolean
  emptyLabel: string
  generatingLabel: string
  loadingIcon?: ReactNode
  generateLabel: string
  generateIcon?: ReactNode
  onGenerate?: () => void
  disabled?: boolean
  className?: string
  children?: ReactNode
}

/** Shared prompt state shell. Apps retain model calls and pass rendered output as children. */
export function WorkspacePromptResult({
  hasPrompt,
  generating = false,
  emptyLabel,
  generatingLabel,
  loadingIcon,
  generateLabel,
  generateIcon,
  onGenerate,
  disabled = false,
  className = "",
  children
}: WorkspacePromptResultProps) {
  if (hasPrompt) {
    return <div className={`workspace-prompt-result ${className}`.trim()}>{children}</div>
  }

  return (
    <div
      className={`workspace-prompt-result workspace-no-prompt ${className}`.trim()}
      aria-live="polite"
      aria-label={generating ? generatingLabel : emptyLabel}
    >
      {generating ? (
        <div className="workspace-prompt-loading">
          {loadingIcon}
          <span>{generatingLabel}</span>
        </div>
      ) : (
        <button type="button" className="workspace-prompt-generate" onClick={onGenerate} disabled={disabled || !onGenerate}>
          {generateIcon}
          {generateLabel}
        </button>
      )}
    </div>
  )
}
