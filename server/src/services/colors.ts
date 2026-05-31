import sharp from 'sharp';

interface ColorCandidate {
  r: number;
  g: number;
  b: number;
  h: number;
  s: number;
  l: number;
  count: number;
  score: number;
}

/**
 * Extract dominant and visually significant colors from an image.
 *
 * Strategy:
 * 1. Sample pixels from the image at moderate resolution
 * 2. Cluster similar colors using quantization
 * 3. Score each color by: frequency × saturation × brightness variance
 * 4. Ensure diversity by enforcing minimum distance between selected colors
 * 5. Balance between dominant colors and accent colors
 */
export async function extractColors(imagePath: string, count: number = 6): Promise<string[]> {
  try {
    const { data, info } = await sharp(imagePath)
      .resize(150, 150, { fit: 'inside' })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Step 1: Cluster pixels into color buckets
    const quantize = (v: number) => Math.min(255, Math.round(v / 24) * 24);
    const colorMap = new Map<string, { r: number; g: number; b: number; count: number }>();

    for (let i = 0; i < data.length; i += 3) {
      const r = quantize(data[i]);
      const g = quantize(data[i + 1]);
      const b = quantize(data[i + 2]);
      const key = `${r},${g},${b}`;
      const existing = colorMap.get(key);
      if (existing) {
        existing.count++;
      } else {
        colorMap.set(key, { r, g, b, count: 1 });
      }
    }

    const totalPixels = (info.width * info.height);

    // Step 2: Convert to HSL and score
    const candidates: ColorCandidate[] = [];
    for (const { r, g, b, count } of colorMap.values()) {
      const [h, s, l] = rgbToHsl(r, g, b);
      const freq = count / totalPixels;

      // Skip near-black, near-white, and very desaturated colors
      if (l < 0.05 || l > 0.97) continue;
      if (s < 0.05 && (l < 0.15 || l > 0.85)) continue;

      // Score: balance frequency with visual significance
      // - High saturation colors get a boost (they're more "design-relevant")
      // - Very frequent but muted colors get penalized slightly
      // - Rare but vibrant colors still get picked
      const satBoost = Math.pow(s, 0.5) * 0.6 + 0.4; // 0.4 ~ 1.0
      const lightScore = 1 - Math.abs(l - 0.5) * 0.8; // prefer mid-lightness
      const score = Math.pow(freq, 0.6) * satBoost * lightScore;

      candidates.push({ r, g, b, h, s, l, count, score });
    }

    // Step 3: Sort by score
    candidates.sort((a, b) => b.score - a.score);

    // Step 4: Select diverse colors (enforce minimum distance)
    const selected: ColorCandidate[] = [];
    const MIN_DISTANCE = 40; // minimum Euclidean distance in RGB space

    for (const candidate of candidates) {
      if (selected.length >= count) break;

      const isDiverse = selected.every((s) => colorDistance(s, candidate) >= MIN_DISTANCE);
      if (isDiverse) {
        selected.push(candidate);
      }
    }

    // If we don't have enough diverse colors, relax the distance constraint
    if (selected.length < count) {
      for (const candidate of candidates) {
        if (selected.length >= count) break;
        if (selected.some((s) => s.r === candidate.r && s.g === candidate.g && s.b === candidate.b)) continue;
        const isDiverse = selected.every((s) => colorDistance(s, candidate) >= MIN_DISTANCE * 0.5);
        if (isDiverse) selected.push(candidate);
      }
    }

    // Step 5: Sort selected by hue for a pleasing palette order
    selected.sort((a, b) => a.h - b.h);

    return selected.map((c) =>
      `#${[c.r, c.g, c.b].map((v) => v.toString(16).padStart(2, '0')).join('')}`
    );
  } catch (err: any) {
    console.error('[Colors] Extraction failed:', err.message);
    return [];
  }
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) return [0, 0, l];

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;

  return [h * 360, s, l];
}

function colorDistance(a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }): number {
  return Math.sqrt(
    Math.pow(a.r - b.r, 2) + Math.pow(a.g - b.g, 2) + Math.pow(a.b - b.b, 2)
  );
}
