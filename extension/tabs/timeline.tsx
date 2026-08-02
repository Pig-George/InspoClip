import { useCallback, useEffect, useMemo, useState } from "react"

import { sendRuntimeCommand } from "../src/runtime/command-client"
import type { Asset, Page } from "../src/runtime/contracts"
import "../src/timeline/style.css"

type AssetContent = { dataUrl: string; mimeType: string }

type TimelineItem = Asset & { content?: AssetContent }

export default function TimelinePage() {
  const [items, setItems] = useState<TimelineItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const loadAssets = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const page = await sendRuntimeCommand<Page<Asset>>({
        type: "runtime.asset.list",
        payload: { state: "saved", limit: 200 }
      })
      const loaded = await Promise.all(page.items.map(async (asset) => {
        if (!asset.blob) return asset
        try {
          const content = await sendRuntimeCommand<AssetContent>({ type: "runtime.asset.content.read", payload: { assetId: asset.id } })
          return { ...asset, content }
        } catch {
          return asset
        }
      }))
      setItems(loaded)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to load local timeline")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void loadAssets() }, [loadAssets])

  const groups = useMemo(() => {
    const grouped = new Map<string, TimelineItem[]>()
    for (const item of items) {
      const date = new Date(item.createdAt).toLocaleDateString()
      const group = grouped.get(date) || []
      group.push(item)
      grouped.set(date, group)
    }
    return Array.from(grouped.entries())
  }, [items])

  return (
    <main className="timeline-page">
      <header className="timeline-header">
        <div>
          <p className="timeline-eyebrow">INSPOCLIP</p>
          <h1>Local timeline</h1>
          <p className="timeline-subtitle">Saved images and videos stored in this browser.</p>
        </div>
        <button type="button" className="timeline-refresh" onClick={() => void loadAssets()} disabled={loading}>
          {loading ? "Loading..." : "Refresh"}
        </button>
      </header>

      {error ? <div className="timeline-message timeline-error">{error}</div> : null}
      {loading && items.length === 0 ? <div className="timeline-message">Loading local assets...</div> : null}
      {!loading && !error && items.length === 0 ? (
        <div className="timeline-empty">
          <strong>Your local timeline is empty</strong>
          <span>Save an image or video from the extension popup to see it here.</span>
        </div>
      ) : null}

      <div className="timeline-groups">
        {groups.map(([date, assets]) => (
          <section className="timeline-group" key={date}>
            <div className="timeline-date"><span>{date}</span><i /></div>
            <div className="timeline-grid">
              {assets.map((asset) => <TimelineCard asset={asset} key={asset.id} />)}
            </div>
          </section>
        ))}
      </div>
    </main>
  )
}

function TimelineCard({ asset }: { asset: TimelineItem }) {
  const title = asset.title || asset.titleZh || asset.titleEn || asset.filename || "Untitled inspiration"
  return (
    <article className="timeline-card">
      <div className="timeline-media">
        {asset.content && asset.kind === "video" ? <video src={asset.content.dataUrl} controls preload="metadata" /> : null}
        {asset.content && asset.kind === "image" ? <img src={asset.content.dataUrl} alt={title} loading="lazy" /> : null}
        {!asset.content ? <div className="timeline-media-missing">Preview unavailable</div> : null}
      </div>
      <div className="timeline-card-body">
        <strong>{title}</strong>
        <span>{asset.kind === "video" ? "Video" : "Image"}</span>
      </div>
    </article>
  )
}
