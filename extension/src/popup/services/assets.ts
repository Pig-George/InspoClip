type ExtensionManifest = {
  icons?: {
    "16"?: string
    "32"?: string
    "48"?: string
    "128"?: string
  }
}

export function getExtensionIconPath(manifest: ExtensionManifest, preferredSize = 48): string {
  const icons = manifest.icons || {}
  return icons[String(preferredSize)] || icons["128"] || icons["32"] || icons["16"] || "assets/icon48.png"
}

export function getExtensionIconUrl(preferredSize = 48): string {
  return chrome.runtime.getURL(getExtensionIconPath(chrome.runtime.getManifest(), preferredSize))
}
