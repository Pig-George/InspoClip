import type { I18nMessages } from "../types"

type VideoSectionProps = {
  t: I18nMessages
  videoProgress: string
  videoResultUrl: string
  videoUrl: string
  onFileChange: (file?: File) => void
  onUrlChange: (value: string) => void
  onUrlSubmit: () => void
}

export function VideoSection({ t, videoProgress, videoResultUrl, videoUrl, onFileChange, onUrlChange, onUrlSubmit }: VideoSectionProps) {
  return (
    <div className="video-section">
      <div className="video-title">🎬 <span>{t.uploadVideo}</span></div>
      <input type="file" accept="video/mp4,video/quicktime,video/webm" onChange={(e) => onFileChange(e.currentTarget.files?.[0])} />
      <div className="input-row video-url-row">
        <input type="url" placeholder="https://example.com/demo.mp4" value={videoUrl} onChange={(e) => onUrlChange(e.target.value)} />
        <button className="btn btn-small" onClick={onUrlSubmit}>{t.analyzeVideo}</button>
      </div>
      <div className="video-progress">{videoProgress}</div>
      <a className="video-result-link" href={videoResultUrl || "#"} hidden={!videoResultUrl}>{t.viewAnalysis}</a>
    </div>
  )
}
