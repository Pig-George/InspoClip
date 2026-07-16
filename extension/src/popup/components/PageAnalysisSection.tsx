import React, { useEffect, useMemo, useRef, useState } from "react"

import type { CaptureMode, I18nMessages } from "../types"
import { PopupIcon } from "./PopupIcon"

export function getPageAnalysisPresentation(mode: CaptureMode, t: I18nMessages) {
  return mode === "area"
    ? { label: t.analyzeCurrentArea, hint: t.areaAnalysisHint }
    : { label: t.analyzeFullPage, hint: t.fullPageAnalysisHint }
}

type PageAnalysisSectionProps = {
  analyzing: boolean
  captureMode: CaptureMode
  currentPageLabel: string
  t: I18nMessages
  onAnalyze: () => void
  onChangeMode: (mode: CaptureMode) => void
}

export function PageAnalysisSection({
  analyzing,
  captureMode,
  currentPageLabel,
  t,
  onAnalyze,
  onChangeMode
}: PageAnalysisSectionProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRootRef = useRef<HTMLDivElement | null>(null)
  const presentation = useMemo(
    () => getPageAnalysisPresentation(captureMode, t),
    [captureMode, t]
  )

  useEffect(() => {
    if (!menuOpen) return
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!menuRootRef.current?.contains(event.target as Node)) setMenuOpen(false)
    }
    document.addEventListener("pointerdown", closeOnOutsidePointer)
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer)
  }, [menuOpen])

  const selectMode = (mode: CaptureMode) => {
    onChangeMode(mode)
    setMenuOpen(false)
  }

  return (
    <section className="page-analysis-section" data-section="page-analysis">
      <div className="page-context-row">
        <span className="section-eyebrow">{t.currentPage}</span>
        <span className="page-site-label" title={currentPageLabel}>{currentPageLabel}</span>
      </div>

      <div className="analysis-control" ref={menuRootRef}>
        <button className="analysis-primary" type="button" disabled={analyzing} onClick={onAnalyze}>
          {analyzing ? <span className="spinner" /> : <PopupIcon name="wand-sparkles" />}
          <span className="analysis-copy">
            <strong>{analyzing ? t.starting : presentation.label}</strong>
            <span>{presentation.hint}</span>
          </span>
        </button>
        <button
          className="analysis-menu-trigger"
          type="button"
          aria-label={t.selectAnalysisScope}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <PopupIcon name="chevron-down" />
        </button>

        <div
          className={`analysis-menu ${menuOpen ? "open" : ""}`}
          role="menu"
          hidden={!menuOpen}
        >
          <ScopeOption
            active={captureMode === "area"}
            hint={t.areaAnalysisHint}
            icon="scan"
            label={t.areaSelect}
            onSelect={() => selectMode("area")}
          />
          <ScopeOption
            active={captureMode === "page"}
            hint={t.fullPageOptionHint}
            icon="panels-top-left"
            label={t.fullPage}
            onSelect={() => selectMode("page")}
          />
        </div>
      </div>

      <div className="shortcut-hint">
        <kbd>Ctrl</kbd><span>+</span><kbd>Shift</kbd><span>+</span><kbd>A</kbd>
        <span>{t.quickAreaAnalyze}</span>
      </div>
    </section>
  )
}

type ScopeOptionProps = {
  active: boolean
  hint: string
  icon: "scan" | "panels-top-left"
  label: string
  onSelect: () => void
}

function ScopeOption({ active, hint, icon, label, onSelect }: ScopeOptionProps) {
  return (
    <button
      className={`analysis-option ${active ? "selected" : ""}`}
      type="button"
      role="menuitemradio"
      aria-checked={active}
      onClick={onSelect}
    >
      <span className="analysis-option-icon"><PopupIcon name={icon} /></span>
      <span className="analysis-option-copy"><strong>{label}</strong><span>{hint}</span></span>
      <PopupIcon name="check" className="analysis-option-check" />
    </button>
  )
}
