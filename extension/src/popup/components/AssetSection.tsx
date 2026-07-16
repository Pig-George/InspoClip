import { useEffect, useRef, useState } from "react"

import type { I18nMessages } from "../types"
import { PopupIcon } from "./PopupIcon"

type AssetSectionProps = {
  assetUrl: string
  t: I18nMessages
  onFileSelect: (file?: File) => void
  onUrlChange: (value: string) => void
  onUrlSubmit: () => void
}

export function AssetSection({
  assetUrl,
  t,
  onFileSelect,
  onUrlChange,
  onUrlSubmit
}: AssetSectionProps) {
  const [dragging, setDragging] = useState(false)
  const [urlOpen, setUrlOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    function handlePaste(event: ClipboardEvent) {
      const file = Array.from(event.clipboardData?.files || []).find((item) => item.type.startsWith("image/") || item.type.startsWith("video/"))
      if (!file) return
      event.preventDefault()
      onFileSelect(file)
    }

    document.addEventListener("paste", handlePaste)
    return () => document.removeEventListener("paste", handlePaste)
  }, [onFileSelect])

  function selectFirstFile(fileList?: FileList | null) {
    onFileSelect(fileList?.[0])
  }

  return (
    <section className="asset-section" data-section="asset-analysis">
      <div className="asset-heading">
        <h2>{t.assetAnalysis}</h2>
        <p>{t.assetAnalysisDescription}</p>
      </div>

      <button
        type="button"
        className={`asset-dropzone ${dragging ? "dragging" : ""}`}
        onClick={() => inputRef.current?.click()}
        onDragEnter={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={(event) => {
          event.preventDefault()
          setDragging(false)
        }}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          selectFirstFile(event.dataTransfer.files)
        }}
      >
        <span className="asset-drop-icon"><PopupIcon name="images" /></span>
        <span className="asset-drop-main">{t.assetDropTitle}</span>
        <span className="asset-drop-sub">{t.assetDropHint}</span>
        <span className="asset-choose-pill">{t.chooseAsset}</span>
      </button>

      <input
        ref={inputRef}
        className="asset-file-input"
        type="file"
        accept="image/*,video/mp4,video/quicktime,video/webm,video/*"
        onChange={(event) => {
          selectFirstFile(event.currentTarget.files)
          event.currentTarget.value = ""
        }}
      />

      <p className="asset-paste-hint">{t.pasteAssetHint}</p>

      <button className={`asset-url-toggle ${urlOpen ? "open" : ""}`} type="button" aria-expanded={urlOpen} onClick={() => setUrlOpen((open) => !open)}>
        <PopupIcon name="link-2" />
        <span>{t.publicVideoUrl}</span>
        <PopupIcon name="chevron-down" className="asset-url-chevron" />
      </button>
      <div className={`asset-url-panel ${urlOpen ? "open" : ""}`}>
        <div className="asset-url-panel-inner">
          <div className="asset-url-row">
            <input type="url" placeholder="https://example.com/demo.mp4" value={assetUrl} onChange={(e) => onUrlChange(e.target.value)} />
            <button type="button" onClick={onUrlSubmit}>{t.analyzeAssetUrl}</button>
          </div>
        </div>
      </div>
    </section>
  )
}
