import { useEffect, useRef, useState } from "react"

import type { I18nMessages } from "../types"

type AssetSectionProps = {
  assetProgress: string
  assetResultUrl: string
  assetUrl: string
  t: I18nMessages
  onFileSelect: (file?: File) => void
  onUrlChange: (value: string) => void
  onUrlSubmit: () => void
}

function AssetIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className="asset-drop-icon">
      <rect x="4" y="7" width="24" height="18" rx="5" fill="currentColor" opacity="0.14" />
      <path d="M9 21l4.4-5.2 3.3 3.8 2.4-2.8L24 21H9z" fill="currentColor" opacity="0.72" />
      <path d="M21 10.5l5 3-5 3v-6z" fill="currentColor" />
      <circle cx="11" cy="12" r="2" fill="currentColor" opacity="0.55" />
    </svg>
  )
}

export function AssetSection({
  assetProgress,
  assetResultUrl,
  assetUrl,
  t,
  onFileSelect,
  onUrlChange,
  onUrlSubmit
}: AssetSectionProps) {
  const [dragging, setDragging] = useState(false)
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
    <div className="asset-section">
      <div className="asset-title">
        <AssetIcon />
        <span>{t.assetAnalysis}</span>
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
        <AssetIcon />
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

      <div className="asset-url-panel">
        <div className="asset-url-label">{t.assetUrlHint}</div>
        <div className="input-row asset-url-row">
          <input type="url" placeholder="https://example.com/demo.mp4" value={assetUrl} onChange={(e) => onUrlChange(e.target.value)} />
          <button className="btn btn-small" onClick={onUrlSubmit}>{t.analyzeAssetUrl}</button>
        </div>
      </div>

      <div className="asset-progress">{assetProgress}</div>
      <a className="asset-result-link" href={assetResultUrl || "#"} hidden={!assetResultUrl}>{t.viewAnalysis}</a>
    </div>
  )
}
