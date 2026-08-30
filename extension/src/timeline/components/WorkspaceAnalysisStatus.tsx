type WorkspaceAnalysisStatusProps = {
  label: string
  completed: number
  total: number
}

export function WorkspaceAnalysisStatus({ label, completed, total }: WorkspaceAnalysisStatusProps) {
  if (total <= 0) return null
  return (
    <div className="workspace-analysis-status" role="status" aria-live="polite">
      <span className="workspace-analysis-status-spinner" aria-hidden="true" />
      <span className="workspace-analysis-status-label">{label}</span>
      {total > 1 ? <span className="workspace-analysis-status-count">{completed}/{total}</span> : null}
    </div>
  )
}
