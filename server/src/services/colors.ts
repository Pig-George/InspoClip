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
 * Improved strategy:
 * 1. Sample pixels at higher resolution for finer color detail
 * 2. Use tighter quantization (16-unit steps) to preserve color nuance
 * 3. Score by: saturation-weighted frequency + contrast significance
 * 4. Detect accent colors from high-gradient regions
 * 5. Ensure diversity with relaxed distance for accent colors
 */
export async function extractColors(imagePath: string, count: number = 6): Promise<string[]> {
  try {
    const { data, info } = await sharp(imagePath)
      .resize(200, 200, { fit: 'inside' })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const width = info.width;
    const height = info.height;

    // Step 1: Cluster pixels with tighter quantization
    const quantize = (v: number) => Math.min(255, Math.round(v / 16) * 16);
    const colorMap = new Map<string, { r: number; g: number; b: number; count: number; edgeCount: number }>();

    // Pre-compute pixel array for edge detection
    const pixels: [number, number, number][] = [];
    for (let i = 0; i < data.length; i += 3) {
      pixels.push([data[i], data[i + 1], data[i + 2]]);
    }

    // Step 2: Detect high-gradient (edge) regions
    const edgeSet = new Set<number>();
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        const [r, g, b] = pixels[idx];
        // Check gradient against neighbors
        const neighbors = [
          pixels[(y - 1) * width + x],
          pixels[(y + 1) * width + x],
          pixels[y * width + (x - 1)],
          pixels[y * width + (x + 1)],
        ];
        let maxDiff = 0;
        for (const [nr, ng, nb] of neighbors) {
          const diff = Math.abs(r - nr) + Math.abs(g - ng) + Math.abs(b - nb);
          maxDiff = Math.max(maxDiff, diff);
        }
        // High gradient threshold
        if (maxDiff > 100) {
          edgeSet.add(idx);
        }
      }
    }

    // Step 3: Cluster and score
    for (let i = 0; i < pixels.length; i++) {
      const [r, g, b] = pixels[i];
      const qr = quantize(r);
      const qg = quantize(g);
      const qb = quantize(b);
      const key = `${qr},${qg},${qb}`;

      const existing = colorMap.get(key);
      if (existing) {
        existing.count++;
        if (edgeSet.has(i)) existing.edgeCount++;
      } else {
        colorMap.set(key, { r: qr, g: qg, b: qb, count: 1, edgeCount: edgeSet.has(i) ? 1 : 0 });
      }
    }

    const totalPixels = width * height;
    const edgePixels = edgeSet.size || 1;

    // Step 4: Score each color
    const candidates: ColorCandidate[] = [];
    for (const { r, g, b, count, edgeCount } of colorMap.values()) {
      const [h, s, l] = rgbToHsl(r, g, b);
      const freq = count / totalPixels;
      const edgeFreq = edgeCount / edgePixels;

      // Skip near-black, near-white
      if (l < 0.04 || l > 0.98) continue;
      // Skip very desaturated (gray) unless they're in high-contrast areas
      if (s < 0.08 && edgeFreq < 0.02) continue;

      // Scoring formula:
      // - Base: frequency (common colors matter)
      // - Saturation boost: vibrant colors are more design-relevant
      // - Edge boost: colors in high-gradient regions are visually significant
      // - Contrast bonus: colors that differ greatly from average get a boost
      const freqScore = Math.pow(freq, 0.45);
      const satBoost = 0.3 + Math.pow(s, 0.4) * 0.7;
      const edgeBoost = 1 + edgeFreq * 3; // up to 4x boost for edge-heavy colors
      const contrastBonus = 1 + Math.abs(l - 0.5) * s * 0.8; // bonus for high-contrast colors

      const score = freqScore * satBoost * edgeBoost * contrastBonus;

      candidates.push({ r, g, b, h, s, l, count, score });
    }

    // Step 5: Sort by score and select diverse colors
    candidates.sort((a, b) => b.score - a.score);

    const selected: ColorCandidate[] = [];
    const MIN_DISTANCE = 35;

    for (const candidate of candidates) {
      if (selected.length >= count) break;
      const isDiverse = selected.every((s) => colorDistance(s, candidate) >= MIN_DISTANCE);
      if (isDiverse) selected.push(candidate);
    }

    // Relax distance if not enough colors
    if (selected.length < count) {
      for (const candidate of candidates) {
        if (selected.length >= count) break;
        if (selected.some((s) => s.r === candidate.r && s.g === candidate.g && s.b === candidate.b)) continue;
        const isDiverse = selected.every((s) => colorDistance(s, candidate) >= MIN_DISTANCE * 0.5);
        if (isDiverse) selected.push(candidate);
      }
    }

    // Sort by hue for pleasing palette order
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
