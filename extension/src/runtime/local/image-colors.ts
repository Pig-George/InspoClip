type ColorCandidate = {
  r: number
  g: number
  b: number
  h: number
  s: number
  l: number
  count: number
  score: number
}

type ColorBucket = {
  r: number
  g: number
  b: number
  count: number
  edgeCount: number
}

const MAX_DIMENSION = 200

export async function extractImageColors(blob: Blob, count = 10): Promise<string[]> {
  if (typeof createImageBitmap !== "function" || typeof OffscreenCanvas === "undefined") return []

  let bitmap: ImageBitmap | undefined
  try {
    bitmap = await createImageBitmap(blob)
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = new OffscreenCanvas(width, height)
    const context = canvas.getContext("2d", { willReadFrequently: true })
    if (!context) return []

    context.drawImage(bitmap, 0, 0, width, height)
    return extractColorPalette(context.getImageData(0, 0, width, height).data, width, height, count)
  } catch {
    return []
  } finally {
    bitmap?.close()
  }
}

// This mirrors the server palette scoring with browser image pixels.
export function extractColorPalette(pixels: Uint8ClampedArray, width: number, height: number, count = 10): string[] {
  if (width <= 0 || height <= 0 || pixels.length < width * height * 4) return []

  const quantize = (value: number) => Math.min(255, Math.round(value / 16) * 16)
  const colorMap = new Map<string, ColorBucket>()
  const edgeSet = new Set<number>()

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const index = y * width + x
      const pixel = pixelAt(pixels, index)
      if (!pixel) continue
      const neighbors = [
        pixelAt(pixels, (y - 1) * width + x),
        pixelAt(pixels, (y + 1) * width + x),
        pixelAt(pixels, y * width + x - 1),
        pixelAt(pixels, y * width + x + 1)
      ]
      let maxDifference = 0
      for (const neighbor of neighbors) {
        if (!neighbor) continue
        maxDifference = Math.max(maxDifference, colorDifference(pixel, neighbor))
      }
      if (maxDifference > 100) edgeSet.add(index)
    }
  }

  let totalPixels = 0
  for (let index = 0; index < width * height; index++) {
    const pixel = pixelAt(pixels, index)
    if (!pixel) continue
    totalPixels += 1
    const r = quantize(pixel.r)
    const g = quantize(pixel.g)
    const b = quantize(pixel.b)
    const key = `${r},${g},${b}`
    const existing = colorMap.get(key)
    if (existing) {
      existing.count += 1
      if (edgeSet.has(index)) existing.edgeCount += 1
    } else {
      colorMap.set(key, { r, g, b, count: 1, edgeCount: edgeSet.has(index) ? 1 : 0 })
    }
  }

  if (totalPixels === 0) return []
  const edgePixels = edgeSet.size || 1
  const candidates: ColorCandidate[] = []
  for (const color of colorMap.values()) {
    const [h, s, l] = rgbToHsl(color.r, color.g, color.b)
    const frequency = color.count / totalPixels
    const edgeFrequency = color.edgeCount / edgePixels
    if (l < 0.04 || l > 0.98) continue
    if (s < 0.08 && edgeFrequency < 0.02) continue

    const score = Math.pow(frequency, 0.45)
      * (0.3 + Math.pow(s, 0.4) * 0.7)
      * (1 + edgeFrequency * 3)
      * (1 + Math.abs(l - 0.5) * s * 0.8)
    candidates.push({ ...color, h, s, l, score })
  }

  candidates.sort((left, right) => right.score - left.score)
  const selected = selectDiverseColors(candidates, count, 35)
  if (selected.length < count) {
    for (const candidate of candidates) {
      if (selected.length >= count) break
      if (selected.some((color) => color.r === candidate.r && color.g === candidate.g && color.b === candidate.b)) continue
      if (selected.every((color) => euclideanDistance(color, candidate) >= 17.5)) selected.push(candidate)
    }
  }

  return selected
    .sort((left, right) => left.h - right.h)
    .map(({ r, g, b }) => `#${[r, g, b].map((value) => value.toString(16).padStart(2, "0")).join("")}`)
}

function pixelAt(pixels: Uint8ClampedArray, index: number): { r: number; g: number; b: number } | null {
  const offset = index * 4
  return pixels[offset + 3] === 0 ? null : { r: pixels[offset], g: pixels[offset + 1], b: pixels[offset + 2] }
}

function colorDifference(left: { r: number; g: number; b: number }, right: { r: number; g: number; b: number }): number {
  return Math.abs(left.r - right.r) + Math.abs(left.g - right.g) + Math.abs(left.b - right.b)
}

function selectDiverseColors(candidates: ColorCandidate[], count: number, minimumDistance: number): ColorCandidate[] {
  const selected: ColorCandidate[] = []
  for (const candidate of candidates) {
    if (selected.length >= count) break
    if (selected.every((color) => euclideanDistance(color, candidate) >= minimumDistance)) selected.push(candidate)
  }
  return selected
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const red = r / 255
  const green = g / 255
  const blue = b / 255
  const max = Math.max(red, green, blue)
  const min = Math.min(red, green, blue)
  const lightness = (max + min) / 2
  if (max === min) return [0, 0, lightness]

  const difference = max - min
  const saturation = lightness > 0.5 ? difference / (2 - max - min) : difference / (max + min)
  let hue = 0
  if (max === red) hue = ((green - blue) / difference + (green < blue ? 6 : 0)) / 6
  else if (max === green) hue = ((blue - red) / difference + 2) / 6
  else hue = ((red - green) / difference + 4) / 6
  return [hue * 360, saturation, lightness]
}

function euclideanDistance(left: { r: number; g: number; b: number }, right: { r: number; g: number; b: number }): number {
  return Math.sqrt(
    Math.pow(left.r - right.r, 2)
    + Math.pow(left.g - right.g, 2)
    + Math.pow(left.b - right.b, 2)
  )
}
