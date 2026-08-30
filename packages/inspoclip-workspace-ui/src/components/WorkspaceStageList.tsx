import type { ReactNode } from "react"

import type { WorkspaceLocale } from "../model"

export type WorkspaceLocalizedValue = string | { en?: string; zh?: string }

export type WorkspaceStageAction = {
  subject: WorkspaceLocalizedValue
  action: WorkspaceLocalizedValue
  durationMs?: number
  easing?: string
}

export type WorkspaceStageItem = {
  id?: string
  title: WorkspaceLocalizedValue
  startSeconds?: number
  endSeconds?: number
  initialState?: WorkspaceLocalizedValue
  trigger?: WorkspaceLocalizedValue
  resultState?: WorkspaceLocalizedValue
  actions?: WorkspaceStageAction[]
  disabled?: boolean
  data?: unknown
}

export type WorkspaceStageListProps = {
  stages: WorkspaceStageItem[]
  locale?: WorkspaceLocale
  ariaLabel?: string
  onSelect?: (stage: WorkspaceStageItem, index: number) => void
  className?: string
  buttonClassName?: string
  titleClassName?: string
  timeClassName?: string
  summaryClassName?: string
  actionClassName?: string
  stepSeparator?: string
  actionSeparator?: string
  renderAction?: (action: WorkspaceStageAction, locale: WorkspaceLocale) => ReactNode
}

export function WorkspaceStageList({
  stages,
  locale = "en",
  ariaLabel = locale === "zh" ? "视频阶段时间线" : "Video stage timeline",
  onSelect,
  className = "workspace-stage-list",
  buttonClassName = "workspace-stage-button",
  titleClassName = "workspace-stage-title",
  timeClassName = "workspace-stage-time",
  summaryClassName = "workspace-stage-summary",
  actionClassName = "workspace-stage-action",
  stepSeparator = locale === "zh" ? " → " : " → ",
  actionSeparator = locale === "zh" ? "：" : ": ",
  renderAction
}: WorkspaceStageListProps) {
  return (
    <div className={className} aria-label={ariaLabel}>
      {stages.map((stage, index) => {
        const summary = [stage.initialState, stage.trigger, stage.resultState]
          .map((value) => localized(value, locale))
          .filter(Boolean)
          .join(stepSeparator)
        const start = formatSeconds(stage.startSeconds)
        const end = formatSeconds(stage.endSeconds)
        const time = start ? `${start} - ${end || start}` : ""

        return (
          <button
            key={stage.id || `${stage.startSeconds ?? "stage"}-${index}`}
            type="button"
            disabled={stage.disabled}
            onClick={() => onSelect?.(stage, index)}
            className={buttonClassName}
          >
            <div className="workspace-stage-heading">
              <strong className={titleClassName}>{index + 1}. {localized(stage.title, locale)}</strong>
              {time ? <span className={timeClassName}>{time}</span> : null}
            </div>
            {summary ? <p className={summaryClassName}>{summary}</p> : null}
            {(stage.actions || []).map((action, actionIndex) => (
              <p key={actionIndex} className={actionClassName}>
                {renderAction ? renderAction(action, locale) : formatAction(action, locale, actionSeparator)}
              </p>
            ))}
          </button>
        )
      })}
    </div>
  )
}

function localized(value: WorkspaceLocalizedValue | undefined, locale: WorkspaceLocale): string {
  if (typeof value === "string") return value
  if (!value) return ""
  return value[locale] || value.en || value.zh || ""
}

function formatSeconds(value: number | undefined): string {
  return typeof value === "number" && Number.isFinite(value) ? `${value.toFixed(1)}s` : ""
}

function formatAction(action: WorkspaceStageAction, locale: WorkspaceLocale, separator: string): string {
  const parts = [
    `${localized(action.subject, locale)}${separator}${localized(action.action, locale)}`,
    typeof action.durationMs === "number" ? `${action.durationMs}ms` : "",
    action.easing || ""
  ].filter(Boolean)
  return parts.join(" · ")
}
