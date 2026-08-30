import type { ReactNode } from "react"

import { WorkspacePromptBlock, type WorkspacePromptBlockProps } from "./WorkspacePromptBlock"
import { WorkspacePromptToolbar, type WorkspacePromptToolbarProps } from "./WorkspacePromptToolbar"

export type WorkspacePromptOutputProps = Pick<WorkspacePromptToolbarProps, "language" | "onLanguageChange" | "onCopy" | "onRegenerate" | "copyState" | "generating" | "disabled" | "labels" | "icons"> & Pick<WorkspacePromptBlockProps, "contentEn" | "contentZh" | "showEn" | "showZh" | "isJson" | "renderContent"> & {
  className?: string
  toolbarClassName?: string
  blockClassName?: string
  contentClassName?: string
  children?: ReactNode
}

/** Shared prompt result layout. Apps own generation state and copy handlers. */
export function WorkspacePromptOutput({
  language,
  onLanguageChange,
  onCopy,
  onRegenerate,
  copyState,
  generating,
  disabled,
  labels,
  icons,
  contentEn,
  contentZh,
  showEn,
  showZh,
  isJson,
  renderContent,
  className = "",
  toolbarClassName = "",
  blockClassName,
  contentClassName,
  children
}: WorkspacePromptOutputProps) {
  return (
    <div className={`workspace-prompt-output ${className}`.trim()}>
      <WorkspacePromptToolbar
        language={language}
        onLanguageChange={onLanguageChange}
        onCopy={onCopy}
        onRegenerate={onRegenerate}
        copyState={copyState}
        generating={generating}
        disabled={disabled}
        labels={labels}
        icons={icons}
        className={toolbarClassName}
      />
      {children || <WorkspacePromptBlock contentEn={contentEn} contentZh={contentZh} showEn={showEn} showZh={showZh} isJson={isJson} className={blockClassName} contentClassName={contentClassName} renderContent={renderContent} />}
    </div>
  )
}
