import type { ReactNode } from "react"

export type WorkspacePromptBlockProps = {
  contentEn?: string
  contentZh?: string
  showEn: boolean
  showZh: boolean
  isJson?: boolean
  className?: string
  contentClassName?: string
  separatorClassName?: string
  jsonClassName?: string
  renderContent?: (content: string) => ReactNode
}

export function WorkspacePromptBlock({
  contentEn = "",
  contentZh = "",
  showEn,
  showZh,
  isJson = false,
  className = "workspace-prompt-card",
  contentClassName = "workspace-prompt-text",
  separatorClassName = "workspace-prompt-separator",
  jsonClassName = "workspace-prompt-json",
  renderContent = (content) => content
}: WorkspacePromptBlockProps) {
  if (isJson) {
    const content = showEn ? contentEn : contentZh
    return <pre className={jsonClassName}>{formatJson(content)}</pre>
  }

  return (
    <div className={className}>
      {showEn && contentEn ? <div className={contentClassName}>{renderContent(contentEn)}</div> : null}
      {showEn && showZh && contentEn && contentZh ? <div className={separatorClassName} /> : null}
      {showZh && contentZh ? <div className={contentClassName}>{renderContent(contentZh)}</div> : null}
    </div>
  )
}

function formatJson(content: string): string {
  try {
    return JSON.stringify(JSON.parse(content), null, 2)
  } catch {
    return content
  }
}
