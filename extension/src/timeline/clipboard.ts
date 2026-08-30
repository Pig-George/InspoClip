function isSupportedAsset(file: File): boolean {
  return file.type.startsWith("image/") || file.type.startsWith("video/")
}

/** Extract image/video files from a paste event for the workspace-level handler. */
export function clipboardAssetFiles(event: ClipboardEvent): File[] {
  const clipboard = event.clipboardData
  const files = clipboard?.files ? Array.from(clipboard.files).filter(isSupportedAsset) : []
  if (files.length) return files

  return Array.from(clipboard?.items || [])
    .filter((item) => item.type.startsWith("image/") || item.type.startsWith("video/"))
    .map((item) => item.getAsFile())
    .filter((file): file is File => Boolean(file))
}
