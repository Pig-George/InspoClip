export function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(",")
  const mime = parts[0].match(/:(.*?);/)?.[1] || "image/jpeg"
  const binaryStr = atob(parts[1] || "")
  const bytes = new Uint8Array(binaryStr.length)
  for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

export function createImagePreviewUrl(
  blob: Blob,
  createObjectUrl: (value: Blob) => string = URL.createObjectURL
): string {
  return createObjectUrl(blob)
}
