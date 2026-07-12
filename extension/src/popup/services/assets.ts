type ExtensionManifest = {
  icons?: {
    "16"?: string
    "32"?: string
    "48"?: string
    "128"?: string
  }
}

function trimBase(url: string): string {
  return String(url || "").replace(/\/+$/, "")
}

async function responseJson<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = body && typeof body === "object" && "error" in body ? String(body.error) : `HTTP ${response.status}`
    throw new Error(error)
  }
  return body as T
}

export type AssetKind = "image" | "video" | "unsupported"

export type ImageAnalysisResult = {
  terms?: string[]
  colors?: string[]
  prompt?: {
    en?: string
    zh?: string
  }
}

export type AssetAnalysisMessage = {
  type: "START_ASSET_ANALYSIS"
  assetKind: Exclude<AssetKind, "unsupported">
  dataUrl: string
  fileName: string
  mimeType: string
}

const VIDEO_EXTENSIONS = [".mp4", ".mov", ".webm", ".m4v"]
const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif"]

export function detectAssetKind(file: File): AssetKind {
  if (file.type.startsWith("image/")) return "image"
  if (file.type.startsWith("video/")) return "video"

  const name = file.name.toLowerCase()
  if (IMAGE_EXTENSIONS.some((extension) => name.endsWith(extension))) return "image"
  if (VIDEO_EXTENSIONS.some((extension) => name.endsWith(extension))) return "video"
  return "unsupported"
}

export async function uploadImageForAnalysis<T = ImageAnalysisResult>(
  fetchFn: typeof fetch,
  serverUrl: string,
  file: File
): Promise<T> {
  const form = new FormData()
  form.append("image", file, file.name || "asset.png")
  return responseJson<T>(await fetchFn(`${trimBase(serverUrl)}/api/images/analyze`, { method: "POST", body: form }))
}

export function fileToDataUrl(file: File): Promise<string> {
  if (typeof FileReader === "undefined") {
    return file.arrayBuffer().then((buffer) => {
      const base64 = Buffer.from(buffer).toString("base64")
      return `data:${file.type || "application/octet-stream"};base64,${base64}`
    })
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error || new Error("Failed to read file"))
    reader.onload = () => resolve(String(reader.result || ""))
    reader.readAsDataURL(file)
  })
}

export async function buildAssetAnalysisMessage(file: File): Promise<AssetAnalysisMessage> {
  const assetKind = detectAssetKind(file)
  if (assetKind === "unsupported") throw new Error("Unsupported asset type")
  return {
    type: "START_ASSET_ANALYSIS",
    assetKind,
    dataUrl: await fileToDataUrl(file),
    fileName: file.name,
    mimeType: file.type || (assetKind === "video" ? "video/mp4" : "image/png")
  }
}

export function getExtensionIconPath(manifest: ExtensionManifest, preferredSize = 48): string {
  const icons = manifest.icons || {}
  return icons[String(preferredSize)] || icons["128"] || icons["32"] || icons["16"] || "assets/icon48.png"
}

export function getExtensionIconUrl(preferredSize = 48): string {
  return chrome.runtime.getURL(getExtensionIconPath(chrome.runtime.getManifest(), preferredSize))
}
