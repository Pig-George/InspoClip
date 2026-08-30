import React from "react"
import type { ExtensionLogEntry } from "../../runtime/extension-logger"
import type { I18nMessages } from "../types"
import { PopupIcon } from "./PopupIcon"

type DevelopmentDiagnosticsProps = {
  diagnostics: ExtensionLogEntry[]
  t: I18nMessages
  onClear: () => void | Promise<void>
}

function copyDiagnostics(diagnostics: ExtensionLogEntry[]): void {
  const text = diagnostics.map((item) => [
    item.timestamp,
    `[${item.source}] ${item.level}`,
    item.context?.method && item.context?.url ? `${item.context.method} ${item.context.url}` : "",
    item.message,
    item.stack || ""
  ].join("\n")).join("\n\n")
  void navigator.clipboard.writeText(text).catch(() => undefined)
}

export function DevelopmentDiagnostics({ diagnostics, t, onClear }: DevelopmentDiagnosticsProps) {
  const title = t.developmentDiagnostics || "Extension logs"
  const empty = t.developmentDiagnosticsEmpty || "No extension logs recorded."
  const copyTitle = t.copyDiagnostics || "Copy extension logs"
  const clearTitle = t.clearDiagnostics || "Clear extension logs"

  return (
    <section className="settings-card development-diagnostics">
      <div className="diagnostics-header">
        <h3><PopupIcon name="bug" />{title}</h3>
        <div className="diagnostics-actions">
          <button type="button" title={copyTitle} aria-label={copyTitle} disabled={!diagnostics.length} onClick={() => copyDiagnostics(diagnostics)}><PopupIcon name="copy" /></button>
          <button type="button" title={clearTitle} aria-label={clearTitle} disabled={!diagnostics.length} onClick={onClear}><PopupIcon name="trash-2" /></button>
        </div>
      </div>
      {diagnostics.length ? (
        <div className="diagnostic-list">
          {diagnostics.map((item, index) => (
            <article className="diagnostic-entry" key={`${item.timestamp}-${index}`}>
              <time>{new Date(item.timestamp).toLocaleTimeString()}</time>
              <strong>[{item.source}] {item.level}{item.context?.method && item.context?.url ? ` · ${item.context.method} ${item.context.url}` : ""}</strong>
              <span>{item.message}</span>
            </article>
          ))}
        </div>
      ) : <p className="settings-hint">{empty}</p>}
    </section>
  )
}
