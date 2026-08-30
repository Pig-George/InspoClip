import type { ReactNode } from "react"

import { WorkspaceDetailSection } from "./WorkspaceDetailSection"
import { WorkspacePromptResult } from "./WorkspacePromptResult"

export type WorkspaceReplicationPurpose = {
  value: string
  label: string
}

export type WorkspaceReplicationPromptPanelProps = {
  title: string
  description?: string
  purposes: WorkspaceReplicationPurpose[]
  selectedPurpose: string
  onPurposeChange: (purpose: string) => void
  showTarget?: boolean
  target?: string
  onTargetChange?: (target: string) => void
  loading?: boolean
  hasOutput: boolean
  onGenerate?: (force: boolean) => void
  error?: string
  labels: {
    purpose: string
    target?: string
    targetPlaceholder?: string
    generate: string
    generating?: string
    loading?: string
  }
  generateIcon?: ReactNode
  loadingIcon?: ReactNode
  output?: ReactNode
  children?: ReactNode
  className?: string
}

/** Shared replication controls. Apps own API calls, persistence and rendered output. */
export function WorkspaceReplicationPromptPanel({
  title,
  description,
  purposes,
  selectedPurpose,
  onPurposeChange,
  showTarget = false,
  target = "",
  onTargetChange,
  loading = false,
  hasOutput,
  onGenerate,
  error,
  labels,
  generateIcon,
  loadingIcon,
  output,
  children,
  className = ""
}: WorkspaceReplicationPromptPanelProps) {
  return (
    <WorkspaceDetailSection
      ariaLabel={title}
      className={`workspace-replication-prompt-panel border-t border-[var(--card-border)] pt-4 ${className}`.trim()}
      titleClassName="text-xs font-heading uppercase tracking-wide text-[var(--text-muted)]"
      title={title}
    >
      {description ? (
        <p className="mt-1 text-xs leading-5 text-[var(--text-muted)] workspace-replication-prompt-description">{description}</p>
      ) : null}
      <div className="workspace-replication-prompt-controls mt-3 space-y-3 rounded-xl border border-[var(--card-border)] bg-[var(--muted)]/35 p-3">
        <div>
          <div className="workspace-replication-prompt-label-row">
            <span>{labels.purpose}</span>
          </div>
          <div className="workspace-replication-purpose-grid" role="group" aria-label={labels.purpose}>
            {purposes.map((purpose) => (
              <button
                key={purpose.value}
                type="button"
                onClick={() => onPurposeChange(purpose.value)}
                className={`rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                  selectedPurpose === purpose.value
                    ? "bg-[var(--accent)] text-white shadow-sm"
                    : ""
                } workspace-replication-purpose ${selectedPurpose === purpose.value ? "is-active" : ""}`}
              >
                {purpose.label}
              </button>
            ))}
          </div>
        </div>

        {showTarget && onTargetChange ? (
          <input
            aria-label={labels.target || labels.purpose}
            value={target}
            placeholder={labels.targetPlaceholder || ""}
            onChange={(event) => onTargetChange(event.target.value)}
            className="workspace-replication-target"
          />
        ) : null}
      </div>

      {error ? <p className="workspace-replication-error">{error}</p> : null}

      <WorkspacePromptResult
        hasPrompt={hasOutput}
        generating={loading}
        emptyLabel={labels.generate}
        generatingLabel={loading ? labels.generating || labels.loading || labels.generate : labels.loading || labels.generate}
        loadingIcon={loadingIcon}
        generateLabel={labels.generate}
        generateIcon={generateIcon}
        onGenerate={() => onGenerate?.(false)}
      >
        {children || output}
      </WorkspacePromptResult>
    </WorkspaceDetailSection>
  )
}
