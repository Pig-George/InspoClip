import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { WorkspaceBilingualTermList, WorkspaceColorSwatch, WorkspaceConfirmDialog, WorkspaceDetailDialog, WorkspaceDetailSection, WorkspaceMediaPreview, WorkspacePromptOutput, WorkspaceReplicationPromptPanel, WorkspacePromptResult, WorkspaceStageList, WorkspaceTagEditor, type WorkspaceBilingualTerm, type WorkspacePromptLanguage, type WorkspaceStageItem } from "@inspoclip/workspace-ui"

import { PopupIcon } from "../../popup/components/PopupIcon"
import { asRecord, assetDetailTitle, localized, localizedPrompt, stageEndSeconds, stageStartSeconds } from "../presentation"
import type { WorkspaceAsset } from "../workspace-model"
import type { Locale, TimelineCopy } from "../types"

type DetailDialogProps = {
  asset: WorkspaceAsset
  copyState: boolean
  locale: Locale
  t: TimelineCopy
  promptGenerating?: boolean
  onClose: () => void
  onCopy: (text?: string) => void
  onGenerate?: (purpose: string, force?: boolean) => void
  onPurposeChange?: (purpose: string) => void
  onTargetChange?: (target: string) => void
  onTagsChange?: (tags: string[]) => void
  onDelete?: () => void | Promise<void>
}

export function DetailDialog({ asset, copyState, locale, t, promptGenerating = false, onClose, onCopy, onGenerate, onPurposeChange, onTargetChange, onTagsChange, onDelete }: DetailDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [language, setLanguage] = useState<WorkspacePromptLanguage>("auto")
  const [closing, setClosing] = useState(false)
  const [copiedTermId, setCopiedTermId] = useState<string | null>(null)
  const copiedTermTimer = useRef<number | undefined>()
  const [copiedColor, setCopiedColor] = useState<string | null>(null)
  const copiedColorTimer = useRef<number | undefined>()
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const analysis = asRecord(asset.analysis)
  const title = assetDetailTitle(asset.kind, locale)
  const stages = Array.isArray(analysis?.stages) ? analysis.stages : []
  const sharedStages: WorkspaceStageItem[] = stages.map((stage, index) => {
    const record = asRecord(stage)
    const actions = Array.isArray(record?.actions) ? record.actions : []
    return {
      id: String(record?.id || `${stageStartSeconds(stage) ?? "stage"}-${index}`),
      title: localized(record?.title || record?.name || `${index + 1}`, locale),
      startSeconds: stageStartSeconds(stage) ?? undefined,
      endSeconds: stageEndSeconds(stage) ?? undefined,
      initialState: record?.initialState,
      trigger: record?.trigger,
      resultState: record?.resultState,
      actions: actions.map((action) => {
        const actionRecord = asRecord(action)
        return {
          subject: localized(actionRecord?.subject, locale),
          action: localized(actionRecord?.action || actionRecord?.description, locale),
          durationMs: typeof actionRecord?.durationMs === "number" ? actionRecord.durationMs : undefined,
          easing: typeof actionRecord?.easing === "string" ? actionRecord.easing : undefined,
        }
      }),
      disabled: asset.kind !== "video" || stageStartSeconds(stage) === null,
      data: stage,
    }
  })
  const colors = Array.isArray(asRecord(analysis?.visualStyle)?.colors) ? asRecord(analysis?.visualStyle)?.colors as string[] : Array.isArray(analysis?.colors) ? analysis.colors as string[] : []
  const terms = Array.isArray(analysis?.designTerms) ? analysis.designTerms : Array.isArray(analysis?.terms) ? analysis.terms : []
  const replicationPrompts = asset.kind === "video" ? asRecord(analysis?.replicationPrompts) || {} : null
  const [purpose, setPurpose] = useState("general")
  const [target, setTarget] = useState("")
  const activePrompt = useMemo(() => {
    if (asset.kind === "image") return localizedPrompt(analysis?.prompt)
    if (purpose === "general" && !replicationPrompts?.general) return localizedPrompt(Object.values(replicationPrompts || {})[0])
    return localizedPrompt(replicationPrompts?.[purpose])
  }, [analysis?.prompt, asset.kind, purpose, replicationPrompts])
  const effectiveLanguage = language === "auto" ? locale : language
  const showEn = effectiveLanguage === "en" || effectiveLanguage === "both"
  const showZh = effectiveLanguage === "zh" || effectiveLanguage === "both"
  const promptText = showEn && showZh ? `${activePrompt.en}\n\n${activePrompt.zh}` : showEn ? activePrompt.en : activePrompt.zh
  const hasPrompt = Boolean(activePrompt.en || activePrompt.zh)
  const bilingualTerms: WorkspaceBilingualTerm[] = terms.map((term, index) => {
    if (typeof term === "string") {
      const divider = term.indexOf(" / ")
      return divider >= 0
        ? { id: `term-${index}`, en: term.slice(0, divider), zh: term.slice(divider + 3) }
        : { id: `term-${index}`, en: term, zh: term }
    }
    const record = asRecord(term)
    const en = typeof record?.en === "string" ? record.en : typeof record?.zh === "string" ? record.zh : localized(term, locale)
    const zh = typeof record?.zh === "string" ? record.zh : en
    return { id: String(record?.id || `term-${index}`), en, zh }
  }).filter((term) => Boolean(term.en))

  const closeDialog = useCallback(() => {
    if (closing) return
    setClosing(true)
    window.setTimeout(onClose, 180)
  }, [closing, onClose])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") closeDialog() }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [closeDialog])

  useEffect(() => () => {
    if (copiedTermTimer.current) window.clearTimeout(copiedTermTimer.current)
    if (copiedColorTimer.current) window.clearTimeout(copiedColorTimer.current)
  }, [])

  const seekStage = (stage: unknown) => {
    const seconds = stageStartSeconds(stage)
    if (seconds === null || !videoRef.current) return
    videoRef.current.currentTime = seconds
    void videoRef.current.play().catch(() => undefined)
  }

  const tagItems = (asset.tags || []).map((tag) => ({ id: tag, label: tag }))
  const copyTerm = (id: string, value: string) => {
    onCopy(value)
    setCopiedTermId(id)
    if (copiedTermTimer.current) window.clearTimeout(copiedTermTimer.current)
    copiedTermTimer.current = window.setTimeout(() => setCopiedTermId(null), 1500)
  }

  const copyColor = (value: string) => {
    onCopy(value.toUpperCase())
    setCopiedColor(value)
    if (copiedColorTimer.current) window.clearTimeout(copiedColorTimer.current)
    copiedColorTimer.current = window.setTimeout(() => setCopiedColor(null), 1500)
  }

  const confirmDelete = async () => {
    if (!onDelete || deleting) return
    setDeleting(true)
    try {
      await onDelete()
      setDeleteConfirmOpen(false)
    } catch {
      // The owning workspace reports the failure and keeps the dialog open.
    } finally {
      setDeleting(false)
    }
  }

  return (
    <WorkspaceDetailDialog
        isClosing={closing}
        title={title}
        closeLabel={t.close}
        onClose={closeDialog}
        headerActions={onDelete ? <button type="button" className="workspace-dialog-delete" title={locale === "zh" ? "删除" : "Delete"} aria-label={locale === "zh" ? "删除" : "Delete"} onClick={() => setDeleteConfirmOpen(true)}><PopupIcon name="trash-2" /></button> : undefined}
        closeButtonClassName="workspace-dialog-close"
        closeButton={<PopupIcon name="x" />}
        bodyClassName={asset.kind === "video" ? "workspace-video-detail-body" : ""}
        media={<WorkspaceMediaPreview kind={asset.kind} src={asset.content?.dataUrl} alt={title} mediaClassName="workspace-detail-media" fallback={<div className="workspace-detail-missing">{t.previewUnavailable}</div>} videoProps={{ controls: true, playsInline: true, preload: "metadata" }} videoRef={videoRef} />}
      >
        {asset.kind === "image" ? (
          <>
            <WorkspaceDetailSection title={t.terms}>
              <WorkspaceBilingualTermList terms={bilingualTerms} copiedId={copiedTermId} copiedIcon={<PopupIcon name="check" />} emptyLabel={locale === "zh" ? "暂无术语" : "No terms"} onCopy={copyTerm} />
            </WorkspaceDetailSection>
            <WorkspaceDetailSection title={t.tags}>
              <WorkspaceTagEditor tags={tagItems} labels={{ add: t.tags, remove: t.close, create: locale === "zh" ? "添加" : "Add", placeholder: locale === "zh" ? "输入标签" : "Tag name" }} editable={Boolean(onTagsChange)} onRemove={(tag) => onTagsChange?.((asset.tags || []).filter((value) => value !== tag.id))} onCreate={(label) => onTagsChange?.([...(asset.tags || []), label])} />
            </WorkspaceDetailSection>
            {colors.length ? <WorkspaceDetailSection title={t.colors}><div className="flex flex-wrap gap-2">{colors.map((color) => {
              const value = String(color)
              return <WorkspaceColorSwatch
                key={value}
                color={value}
                onSelect={(selected) => copyColor(selected)}
                variant="item"
                className="group flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-[var(--card-border)] hover:border-[var(--accent)] transition-colors"
                swatchClassName="w-6 h-6 rounded-md border border-[var(--card-border)]"
                labelClassName="text-xs font-mono text-[var(--text-muted)] group-hover:text-[var(--text)]"
                title={value.toUpperCase()}
                label={copiedColor === value ? <PopupIcon name="check" className="w-3.5 h-3.5 text-green-500" /> : value.toUpperCase()}
              />
            })}</div></WorkspaceDetailSection> : null}
            <WorkspaceDetailSection title="AI Prompt">
              <WorkspacePromptResult hasPrompt={hasPrompt} generating={promptGenerating} emptyLabel={t.noPrompt} generatingLabel={t.generatingPrompt} generateLabel={t.generatePrompt} generateIcon={<PopupIcon name="sparkles" />} onGenerate={() => onGenerate?.("image-design", true)}>
                {hasPrompt ? <WorkspacePromptOutput language={language} onLanguageChange={setLanguage} onCopy={() => onCopy(promptText)} onRegenerate={() => onGenerate?.("image-design", true)} copyState={copyState} generating={promptGenerating} labels={{ auto: t.languageAuto, en: t.languageEn, zh: t.languageZh, both: t.languageBoth, copy: t.copy, copied: t.copied, regenerate: t.regeneratePrompt }} icons={{ copy: <PopupIcon name="copy" />, copied: <PopupIcon name="check" />, regenerate: <PopupIcon name="refresh-cw" /> }} contentEn={activePrompt.en} contentZh={activePrompt.zh} showEn={showEn} showZh={showZh} /> : null}
              </WorkspacePromptResult>
            </WorkspaceDetailSection>
          </>
        ) : (
          <>
            <WorkspaceDetailSection title={t.tags}>
              <WorkspaceTagEditor tags={tagItems} labels={{ add: t.tags, remove: t.close, create: locale === "zh" ? "添加" : "Add", placeholder: locale === "zh" ? "输入标签" : "Tag name" }} editable={Boolean(onTagsChange)} onRemove={(tag) => onTagsChange?.((asset.tags || []).filter((value) => value !== tag.id))} onCreate={(label) => onTagsChange?.([...(asset.tags || []), label])} />
            </WorkspaceDetailSection>
            <WorkspaceDetailSection title={t.stages}>
              {analysis?.summary ? <h4 className="workspace-analysis-summary">{localized(analysis.summary, locale)}</h4> : null}
              {stages.length ? <WorkspaceStageList stages={sharedStages} locale={locale} onSelect={(stage) => seekStage(stage.data)} /> : <p className="workspace-analysis-empty">{t.stageEmpty || t.analysisPending}</p>}
            </WorkspaceDetailSection>
            <WorkspaceReplicationPromptPanel
              title={t.replicationTitle}
              description={t.replicationDescription}
              purposes={[
                { value: "general", label: locale === "zh" ? "通用" : "General" },
                { value: "video-generation", label: locale === "zh" ? "视频生成" : "Video generation" },
                { value: "frontend", label: locale === "zh" ? "前端实现" : "Frontend" },
                { value: "motion-design", label: locale === "zh" ? "AE / Figma" : "Motion design" },
                { value: "storyboard", label: locale === "zh" ? "分镜脚本" : "Storyboard" },
                { value: "json", label: locale === "zh" ? "结构化 JSON" : "Structured JSON" }
              ]}
              selectedPurpose={purpose}
              onPurposeChange={(next) => {
                setPurpose(next)
                setTarget("")
                onPurposeChange?.(next)
              }}
              showTarget={!["general", "json"].includes(purpose)}
              target={target}
              onTargetChange={(next) => {
                setTarget(next)
                onTargetChange?.(next)
              }}
              loading={promptGenerating}
              hasOutput={hasPrompt}
              onGenerate={() => onGenerate?.(purpose, true)}
              labels={{
                purpose: t.purposeLabel,
                target: t.targetLabel,
                targetPlaceholder: t.targetPlaceholder,
                generate: t.generateOutput,
                generating: t.generatingOutput
              }}
              generateIcon={<PopupIcon name="sparkles" />}
            >
              {hasPrompt ? (
                <WorkspacePromptOutput
                  language={language}
                  onLanguageChange={setLanguage}
                  onCopy={() => onCopy(promptText)}
                  onRegenerate={() => onGenerate?.(purpose, true)}
                  copyState={copyState}
                  generating={promptGenerating}
                  labels={{ auto: t.languageAuto, en: t.languageEn, zh: t.languageZh, both: t.languageBoth, copy: t.copy, copied: t.copied, regenerate: t.regeneratePrompt }}
                  icons={{ copy: <PopupIcon name="copy" />, copied: <PopupIcon name="check" />, regenerate: <PopupIcon name="refresh-cw" /> }}
                  contentEn={activePrompt.en}
                  contentZh={activePrompt.zh}
                  showEn={showEn}
                  showZh={showZh}
                />
              ) : null}
            </WorkspaceReplicationPromptPanel>
          </>
        )}
      {deleteConfirmOpen ? <WorkspaceConfirmDialog title={locale === "zh" ? "确认删除" : "Confirm deletion"} description={locale === "zh" ? (asset.kind === "video" ? "视频及其分析结果将被永久删除。" : "图片及其分析结果将被永久删除。") : (asset.kind === "video" ? "The video and its analysis will be permanently deleted." : "The image and its analysis will be permanently deleted.")} cancelLabel={locale === "zh" ? "取消" : "Cancel"} confirmLabel={deleting ? (locale === "zh" ? "删除中..." : "Deleting...") : (locale === "zh" ? "确认删除" : "Delete")} icon={<PopupIcon name="alert-triangle" />} pending={deleting} onCancel={() => setDeleteConfirmOpen(false)} onConfirm={() => void confirmDelete()} /> : null}
    </WorkspaceDetailDialog>
  )
}
